var util = require('util');
var msRestAzure = require('ms-rest-azure');
var resourceManagement = require("azure-arm-resource");
var ResourceManagementClient = require('azure-arm-resource').ResourceManagementClient;
var HDInsightManagementClient = require('azure-arm-hdinsight');


function ManageHDInsight(config) {

  var resourceClient = null;
  var hdinsightClient = null;
  var _config = config;

  function init(callback) {

    if (!_config) {
      try {
        _config = require('../lib/config');
      } catch (e) {
        return callback(new Error("There was an error reading configuration: " + e));
      }
    }

    //service principal authentication 
    msRestAzure.loginWithServicePrincipalSecret(_config.clientId, _config.secret, _config.domain, function (err, credentials) {
      
      if (err) {
        console.error('There was a problem connecting to azure.', err);
        return callback(err);
      }

      // This is a fix to enable resource client and hdinsight client
      // to know the subscription through the credentials object 
      credentials.subscriptionId = _config.subscriptionId;
      resourceClient = resourceManagement.createResourceManagementClient(credentials);
      hdinsightClient = HDInsightManagementClient.createHDInsightManagementClient(credentials);

      return callback(null, credentials);
    });
  }

  function createHDInsightWithARM(callback) {

    if (!resourceClient) { return callback(new Error('Please call init before performing actions on resources')); }

    var identity = {
      "resourceName": _config.clusterName,
      "resourceProviderNamespace": "Microsoft.HDInsight",
      "resourceType": "clusters",
      "resourceProviderApiVersion": _config.clusterApiVersion,
    };
    var parameters = {
      "location": _config.location,
      "tags": _config.tags,
      "properties": {
        "clusterVersion": _config.clusterVersion,
        "osType": _config.osType,
        "clusterDefinition": {
          "kind": _config.clusterType,
          "configurations": {
            "gateway": {
              "restAuthCredential.isEnabled": true,
              "restAuthCredential.username": _config.clusterLoginUserName,
              "restAuthCredential.password": _config.clusterLoginPassword
            }
          }
        },
        "storageProfile": {
          "storageaccounts": [
            {
              "name": _config.clusterStorageAccountName + '.blob.core.windows.net',
              "isDefault": true,
              "container": _config.clusterName,
              "key": _config.clusterStorageAccountKey
            }
          ]
        },
        "computeProfile": {
          "roles": [
            {
              "name": "headnode",
              "targetInstanceCount": "2",
              "hardwareProfile": {
                "vmSize": _config.clusterNodeSize
              },
              "osProfile": {
                "linuxOperatingSystemProfile": {
                  "username": _config.sshUserName,
                  "password": _config.sshPassword
                }
              }
            },
            {
              "name": "workernode",
              "targetInstanceCount": _config.clusterWorkerNodeCount,
              "hardwareProfile": {
                "vmSize": _config.clusterNodeSize
              },
              "osProfile": {
                "linuxOperatingSystemProfile": {
                  "username": _config.sshUserName,
                  "password": _config.sshPassword
                }
              }
            }
          ]
        }
      }
    };

    resourceClient.resources.beginCreating(_config.resourceGroupName, identity, parameters, callback);
  }

  function checkHDInsightCluster(callback) {

    if (!hdinsightClient) { return callback(new Error('Please call init before performing actions on resources')); }

    hdinsightClient.clusters.get(_config.resourceGroupName, _config.clusterName, callback);
  }
  
  function deleteHDInsightCluster(callback) {
    hdinsightClient.clusters.beginDeleting(_config.resourceGroupName, _config.clusterName, callback);
  }

  function listAllARMResources(callback) {

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

  /**
   * This method is meant to use hdinsightClient which would deprecate the 
   * usage of resourceClient, but currently create functionality is not fully
   * supported.
   */
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
    checkHDInsight: checkHDInsightCluster,
    deleteHDInsight: deleteHDInsightCluster,
    list: listAllARMResources
  };
}

module.exports = ManageHDInsight;