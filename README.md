# HDInsight Controller
This is a web service that enables on-demand creation and destruction of an HDInsight cluster.
Use this repository as an example of creating \ destroying an HDInsight cluster on demand.
To read the full story behind the repository the [Case study placeholder](http://none)

# Prerequisites
To run this example you will need the following:
* [Azure CLI][azure-cli]
* [An active azure subscription](http://portal.azure.com)
* [Setting up a service principal](#setting-up-service-principal)
* [Provide configuration settings](#provide-configuration-settings)

## Setting Up Service Principal
[Create service principal using azure cli][create-sp-cli] or [Create service principal using the portal][create-sp-portal].
Make sure to use **Contributor** instead of **Reader** when setting up the permission for the service principal.
The service principal will ensure that your web service has permissions to access \ change resources on your cloud service.

## Provide configuration settings

* `servicePrincipalClientId` - Service principal client id
* `servicePrincipalSecret` - Service principal secret
* `servicePrincipalDomain` - Service principal domain
* `servicePrincipalSubscriptionId` - Service principal subscription

* `clusterName` - name for the hdinsight cluster resource
* `clusterApiVersion` - this is the version to use in the ARM deployment, use "2015-03-01-preview" as default
* `tags` - Tags to add to the clusterm, use "{}" as default
* `clusterVersion` - cluster version, use "3.4" as default
* `osType` - i.e. Linux / Windows
* `clusterType` - i.e. Spark
* `clusterLoginUserName` - to login to the HDInsight cluster
* `clusterLoginPassword` - password to login to the HDInsight cluster

* `inputQueueName` - Queue name for pending jobs. i.e. pending-jobs
* `sendAlertUrl` - in case there are problems with the process, post errors to this URL. i.e. http://none.none

* `clusterNodeSize` - i.e. Standard_D12
* `clusterWorkerNodeCount` - i.e. 2
* `sshUserName` - username to ssh login to the HDInsight cluster
* `sshPassword` - password to ssh login to the HDInsight cluster

# Running Locally
After you've completed setting up the prerequisites, use the information you gathered to fill the following information
in [config/dev.sample.json](config/dev.sample.json):

* `proxyAppName` - proxy service app name
* `resourceGroupName` - resource group the resources are deployed to
* `location` - geo location like "West Europe"

* `clusterStorageAccountName` - storage account name for the hdinsight cluster
* `clusterStorageAccountKey` - storage account key for the hdinsight cluster


You can create a `config/dev.private.json` copy which will not be checked in.

## Installation
```
npm install
npm start
```

# Deployment
After you've completed setting up the prerequisites, use the information you gathered to fill the relevant data
in [deploy/azuredeploy.parameters.json](deploy/azuredeploy.parameters.json).

You can create a `deploy/azuredeploy.parameters.private.json` copy with your own information which will not be checked in.

Run The following with azure cli to deploy to the cloud:

First, login to azure cli:
```
cd deploy
azure login
```
Then create a resource group (location can be 'West Europe'):
```
azure group create <resource group name> -l <location>
```
Now, deploy the json to the cloud:
```
azure group deployment create -f azuredeploy.json -e azuredeploy.parameters.private.json <resource group name> <deployment name>
```

# Endpoints
The following are the endpoints the web service exposes (Use `localhost:3000` for running locally):

* POST `/hdinsight/create`
* GET `/hdinsight/get`

With the following response format:
```
{
  status: '<Provisioning State> / ResourceNotFound / Unknown',
  error: 'In case there was an error or the resource was not found',
  result: 'The full resource information as returned from ARM'
}
```

* DELETE `/hdinsight/destroy`
* POST `/functions/start`
* POST `/functions/stop`
* GET `/functions/status`

With the following response format:
```
{ 
  status: 'running/stopped',
  result: { full JSON representation of the service app }
}
```

* POST `/jobs/insert`


[//]: # (Links section)

   [azure-cli]: <https://azure.microsoft.com/en-us/documentation/articles/xplat-cli-install/>
   [create-sp-portal]: <https://azure.microsoft.com/en-us/documentation/articles/resource-group-create-service-principal-portal/>
   [create-sp-cli]: <https://azure.microsoft.com/en-us/documentation/articles/resource-group-authenticate-service-principal-cli/>

   [//]: # (Cover image source: http://www.publicdomainpictures.net/view-image.php?image=34175&picture=human-dna)
   [//]: # (Cover image license: http://creativecommons.org/publicdomain/zero/1.0/)