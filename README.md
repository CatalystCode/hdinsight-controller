# HDInsight Controller
This is a web service that enables on-demand creation and destruction of HDInsight resources.

# Background
This repository gives an example of how to create \ destroy HDInsight resources on demand.
The example presumes a predefined configuration profile that exposes:
* hd-insight name
* hd-insight resource group name
* hd-insight configuration

# Prerequisites
To run this example you will need the following (To run this from the cloud follow [Deployment](#deployment)):
* [Azure CLI][azure-cli]
* [An active azure subscription](http://portal.azure.com)
* [Setting up a service principal](#setting-up-service-principal)

## Setting Up Service Principal
[Create service principal using azure cli][create-sp-cli] or [Create service principal using the portal][create-sp-portal].
Make sure that the permission you give is **Contributor** instead of **Reader**.
The service principal will ensure that you're web service has permissions to access \ change resources on your cloud service.

# Running Locally
After you've completed setting up the prerequisites, use the information you gathered to fill the following information
in [setenv.sample.bat][setenv.sample.bat]:
* servicePrincipalClientId
* servicePrincipalSecret
* servicePrincipalDomain
* servicePrincipalSubscriptionId
You can create a 'setenv.private.bat' copy which will not be checked in.

## Installation
```
setenv.private.bat
npm install
npm start
```

# Deployment
After you've completed setting up the prerequisites, use the information you gathered to fill the following information
in [azuredeploy.parameters.json][deploy/azuredeploy.parameters.json]:
* servicePrincipalClientId
* servicePrincipalSecret
* servicePrincipalDomain
* servicePrincipalSubscriptionId
You can create a 'azuredeploy.parameters.private.json' copy which will not be checked in.

Run The following with azure cli to deploy to the cloud:

First, login to azure cli:
```
azure login
```
Then create a resource group (location can be 'West Europe'):
```
azure group create <resource group name> -l <location>
```
Now, deploy the json to the cloud:
```
cd deploy
azure group deployment create -f azuredeploy.json -e azuredeploy.parameters.json <resource group name> <deployment name>
```

# Endpoints
The following are the endpoints the web service exposes (for local running the service url is `localhost:3000`):
* `http://{service url}/hdinsight/create`[POST]
* `http://{service url}/hdinsight/get`[GET]
* `http://{service url}/hdinsight/destroy`[DELETE]

When getting an HDInsight cluster the result will be in the format:
```
{
  status: '<Provisioning State> / ResourceNotFound / Unknown',
  error: 'In case there was an error or the resource was not found',
  result: 'The full resource information as returned from ARM'
}
```

[//]: # (Links section)

   [azure-cli]: <https://azure.microsoft.com/en-us/documentation/articles/xplat-cli-install/>
   [create-sp-portal]: <https://azure.microsoft.com/en-us/documentation/articles/resource-group-create-service-principal-portal/>
   [create-sp-cli]: <https://azure.microsoft.com/en-us/documentation/articles/resource-group-authenticate-service-principal-cli/>

   [//]: # (Cover image source: http://www.publicdomainpictures.net/view-image.php?image=34175&picture=human-dna)
   [//]: # (Cover image license: http://creativecommons.org/publicdomain/zero/1.0/)