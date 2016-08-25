var util = require('util');
var msRestAzure = require('ms-rest-azure');
var resourceManagement = require("azure-arm-resource");
var ResourceManagementClient = require('azure-arm-resource').ResourceManagementClient;
var HDInsightManagementClient = require('azure-arm-hdinsight');


function ManageHDInsight(config) {

  var resourceClient = null;
  var hdinsightClient = null;

  function init(callback) {

    //service principal authentication 
    msRestAzure.loginWithServicePrincipalSecret(config.clientId, config.secret, config.domain, function (err, credentials) {
      
      if (err) {
        console.error('There was a problem connecting to azure.', err);
        return callback(err);
      }

      // This is a fix to enable resource client and hdinsight client
      // to know the subscription through the credentials object 
      credentials.subscriptionId = config.subscriptionId;
      resourceClient = resourceManagement.createResourceManagementClient(credentials);
      hdinsightClient = HDInsightManagementClient.createHDInsightManagementClient(credentials);

      return callback(null, credentials);
    });
  }

  function createHDInsightWithARM(callback) {

    if (!resourceClient) { return callback(new Error('Please call init before performing actions on resources')); }

    var identity = {
      "resourceName": config.clusterName,
      "resourceProviderNamespace": "Microsoft.HDInsight",
      "resourceType": "clusters",
      "resourceProviderApiVersion": config.clusterApiVersion,
    };
    var parameters = {
      "location": config.location,
      "tags": config.tags,
      "properties": {
        "clusterVersion": config.clusterVersion,
        "osType": config.osType,
        "clusterDefinition": {
          "kind": config.clusterType,
          "configurations": {
            "gateway": {
              "restAuthCredential.isEnabled": true,
              "restAuthCredential.username": config.clusterLoginUserName,
              "restAuthCredential.password": config.clusterLoginPassword
            }
          }
        },
        "storageProfile": {
          "storageaccounts": [
            {
              "name": config.clusterStorageAccountName + '.blob.core.windows.net',
              "isDefault": true,
              "container": config.clusterName,
              "key": config.clusterStorageAccountKey
            }
          ]
        },
        "computeProfile": {
          "roles": [
            {
              "name": "headnode",
              "targetInstanceCount": "2",
              "hardwareProfile": {
                "vmSize": config.clusterNodeSize
              },
              "osProfile": {
                "linuxOperatingSystemProfile": {
                  "username": config.sshUserName,
                  "password": config.sshPassword
                }
              }
            },
            {
              "name": "workernode",
              "targetInstanceCount": config.clusterWorkerNodeCount,
              "hardwareProfile": {
                "vmSize": config.clusterNodeSize
              },
              "osProfile": {
                "linuxOperatingSystemProfile": {
                  "username": config.sshUserName,
                  "password": config.sshPassword
                }
              }
            }
          ]
        }
      }
    };

    resourceClient.resources.createOrUpdate(config.resourceGroupName, identity, parameters, callback);
  }

  function listAllARMResources(resourceClient) {

    // Listing all existing resources
    resourceClient.resources.list(function (err, result) {

      result.resources.forEach(function (resource) {
        return console.log(resource.name);
      });
    });
  }

  function listHDInsightClusters(hdinsightClient) {
    hdinsightClient.clusters.list(function (err, result) {

      result.clusters.forEach(function (cluster) {
        console.log(cluster.name);
      });

    })
  }

  function deleteHDInsightCluster(callback) {
    hdinsightClient.clusters.deleteMethod(config.resourceGroupName, config.clusterName, callback);
  }

  function createHDInsightCluster(hdinsightClient) {

    var parameters = {
      "location": location,
      "tags": tags,
      "properties": {
        "clusterVersion": clusterVersion,
        "operatingSystemType": osType,
        "clusterDefinition": {
          "clusterType": clusterType,
          "configurations": {
            "gateway": {
              "restAuthCredential.isEnabled": true,
              "restAuthCredential.username": clusterLoginUserName,
              "restAuthCredential.password": clusterLoginPassword
            }
          }
        },
        "storageProfile": {
          "storageaccounts": [
            {
              "name": clusterStorageAccountName + '.blob.core.windows.net',
              "isDefault": true,
              "container": clusterName,
              "key": clusterStorageAccountKey
            }
          ]
        },
        "computeProfile": {
          "roles": [
            {
              "name": "headnode",
              "targetInstanceCount": "2",
              "hardwareProfile": {
                "vmSize": clusterNodeSize
              },
              "osProfile": {
                "linuxOperatingSystemProfile": {
                  "userName": sshUserName,
                  "password": sshPassword
                }
              }
            },
            {
              "name": "workernode",
              "targetInstanceCount": clusterWorkerNodeCount,
              "hardwareProfile": {
                "vmSize": clusterNodeSize
              },
              "osProfile": {
                "linuxOperatingSystemProfile": {
                  "userName": sshUserName,
                  "password": sshPassword
                }
              }
            }
          ]
        }
      }
    };

    // Create new cluster
    hdinsightClient.clusters.create(resourceGroupName, clusterName, parameters, function (err, result) {
      console.log(result);
    });

  }

  return {
    init: init,
    createHDInsight: createHDInsightWithARM,
    deleteHDInsight: deleteHDInsightCluster
  };
}

module.exports = ManageHDInsight;