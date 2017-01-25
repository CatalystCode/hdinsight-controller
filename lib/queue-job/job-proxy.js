var async = require('async');
var request = require('request');
var config = require('../../config').svc;

function jobProxy() {

  var queueIn = null; 
  var queueOut = null;

  // this function is called by the worker after it is initialized
  function initializeQueues(queueInObj, queueOutObj) {
    queueIn = queueInObj;
    queueOut = queueOutObj;
  }

  function processMessage(message, callback) {

    try {
      var authenticationHeader = 'Basic ' + new Buffer(config.clusterLoginUserName + ':' + config.clusterLoginPassword).toString('base64');
      var payload
      if (message.file){
        payload = message;
      }
      else {
        {
          payload = {
            "file": "wasb://" + config.clusterName + "@" + config.clusterStorageAccountName + ".blob.core.windows.net/" + config.localFileToRun, // file to run
            "args": ["param1", "param2"], // args to give to the job file (array of strings): pull data from "data" object and pass as parameters to the job 
            "name": "new-job-name" // job name
          }
        }
      }
      var options = {
        uri: 'https://' + config.clusterName + '.azurehdinsight.net/livy/batches',
        method: 'POST',
        headers: {
          "Content-Type": 'application/json', 
          "Authorization": authenticationHeader 
        },
        json: payload
      };

      console.log(`Posting to livy: ${JSON.stringify(payload)}`);

      request(options, function (err, response, body) {

        if (err || !response || (response.statusCode != 200 && response.statusCode != 201)) {
          var errMsg = err ? err : !response ? 
            new Error ('No response received') :
            new Error ('Status code [' + response.statusCode + '] is not successfull');
          console.info('Error receiving response:\n\r', err, '\n\r', JSON.stringify(response));
          return callback(errMsg);
        }

        if (!body || body.state !== 'running') {
          var err = new Error('new job state is not running: ' + JSON.stringify(body));
          console.error(err);
          return callback(err);
        }

        console.log('Submitted successfully');

        // Entering the same message to an out queue for history
        return queueOut.sendMessage(message, function (err) {
          if (err) {
            message.error('failed to queue message: <%s>', JSON.stringify(message));
            return callback(err);
          }
          
          message.info('queued message: <%s>', JSON.stringify(message));
          return callback();
        });
      });
    } catch (err) {
      console.error('There was a problem posting to LIVY', err);
      callback(err);
    }
  }
  
  return {
    processMessage: processMessage,
    initializeQueues: initializeQueues,
    queueInName: config.inputQueueName,
    queueOutName: config.inputQueueName + '-done'
  };
}

module.exports = jobProxy;