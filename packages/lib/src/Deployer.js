'use strict'

import App from "./app/App"
import Package from "./package/Package"
import { DeployError } from './utils/errors/DeployError'
import { semanticVersionToString } from "./utils/Semver";

export class PackageDeployer {
  constructor(version = semanticVersionToString(version), txParams, existingAddresses) {
    this.txParams = txParams
    this.version = version
    this.addresses = {}
    Object.keys(existingAddresses).forEach(k => this.addresses[k] = existingAddresses[k])
  }

  async fetchOrDeploy() {
    const { version, addresses: { packageAddress }, txParams } = this
    try {
      this.package = packageAddress
        ? await Package.fetch(packageAddress, txParams)
        : await Package.deploy(txParams)
      this.provider = await this.package.hasVersion(version)
        ? await this.package.getDirectory(version)
        : await this.package.newVersion(version)

      return this
    } catch(deployError) {
      throw new DeployError(deployError.message, this)
    }
  }

  getAddresses() {

  }
}

export class AppDeployer extends PackageDeployer {
  constructor(name, version = semanticVersionToString(version), txParams, existingAddresses) {
    this.name = name
    super(version, txParams, existingAddresses)
  }

  async fetchOrDeploy() {
    const { name, version, addresses: { appAddress }, txParams } = this

    try {
      this.app = appAddress
        ? await App.fetch(appAddress, txParams)
        : await App.deploy(txParams)

      await super.fetchOrDeploy(version, txParams, { packageAddress })
      if (!await this.app.hasPackage(name, version)) await this.app.setPackage(name, this.package.address, version)

      return this
    } catch(deployError) {
      throw new DeployError(deployError.message, this)
    }
  }

  getAddresses() {

  }
}

