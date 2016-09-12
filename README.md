# HDInsight Controller
This is a web service that enables on-demand creation and destruction of an HDInsight cluster.

# Background
Use this repository as an example of creating \ destroying an HDInsight cluster on demand.
This example presumes a predefined configuration profile that exposes:
* hd-insight name
* hd-insight resource group name
* hd-insight configuration

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
```
Set config...
```

# Running Locally
After you've completed setting up the prerequisites, use the information you gathered to fill the following information
in [config/dev.sample.json](config/dev.sample.json):

* `servicePrincipalClientId`
* `servicePrincipalSecret`
* `servicePrincipalDomain`
* `servicePrincipalSubscriptionId`

You can create a `config/dev.private.json` copy which will not be checked in.

## Installation
```
npm install
npm start
```

# Deployment
After you've completed setting up the prerequisites, use the information you gathered to fill the following information
in [deploy/azuredeploy.parameters.json](deploy/azuredeploy.parameters.json):

* `servicePrincipalClientId`
* `servicePrincipalSecret`
* `servicePrincipalDomain`
* `servicePrincipalSubscriptionId`

You can create a `deploy/azuredeploy.parameters.private.json` copy which will not be checked in.

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

* POST `http://{service url}/hdinsight/create`
* GET `http://{service url}/hdinsight/get`

With the following response format:
```
{
  status: '<Provisioning State> / ResourceNotFound / Unknown',
  error: 'In case there was an error or the resource was not found',
  result: 'The full resource information as returned from ARM'
}
```

* DELETE `http://{service url}/hdinsight/destroy`
* POST `http://{service url}/functions/start`
* POST `http://{service url}/functions/stop`
* GET `http://{service url}/functions/status`

With the following response format:
```
{ 
  status: 'running/stopped'
}
```

* POST `http://{service url}/jobs/insert`


# See Also
This is the repository for the function app that acts as a proxy between the queue and the hdinsight cluster:
https://github.com/CatalystCode/hdinsight-controller-proxy

This is the repository for the function app that acts as an automatic orchestrator of the resources:
https://github.com/CatalystCode/hdinsight-controller-orch

[//]: # (Links section)

   [azure-cli]: <https://azure.microsoft.com/en-us/documentation/articles/xplat-cli-install/>
   [create-sp-portal]: <https://azure.microsoft.com/en-us/documentation/articles/resource-group-create-service-principal-portal/>
   [create-sp-cli]: <https://azure.microsoft.com/en-us/documentation/articles/resource-group-authenticate-service-principal-cli/>

   [//]: # (Cover image source: http://www.publicdomainpictures.net/view-image.php?image=34175&picture=human-dna)
   [//]: # (Cover image license: http://creativecommons.org/publicdomain/zero/1.0/)