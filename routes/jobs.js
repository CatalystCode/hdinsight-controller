var express = require('express');
var ServiceAppActions = require('../lib/manage-functions').ServiceAppActions;
var azure = require('azure-storage');

var router = express.Router();

router.post('/push', function(req, res) {

  var config = null;
  try {
    config = require('../lib/config');
  } catch (e) {
    return res.status(400).send('There was an error reading configuration:\n' + err);
  }

  var data = req.body.data;
  if (!data) {
      return res.status(400).send('No data parameter was supplied in the request');
  }
  
  var queueSvc = azure.createQueueService(config.clusterStorageAccountName, config.clusterStorageAccountKey)
      .withFilter(new azure.ExponentialRetryPolicyFilter());

  queueSvc.createQueueIfNotExists(config.inputQueueName, function(err) {
    if (err) {
      return res.status(400).send('There was an error reading the queue:\n' + err);
    }

    queueSvc.createMessage(config.inputQueueName, data, function(err, result, response){
      if(err){
        return res.status(400).send('There was a problem inserting message into queue:\n' + err);
      }

      console.log('message inserted to queue successfully');
      res.send("message inserted to queue successfully");
    });
  });

});

module.exports = router;