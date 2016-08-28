var express = require('express');
var ServiceAppActions = require('../lib/manage-functions').ServiceAppActions;

var router = express.Router();

router.post('/start', function(req, res) {
  
  var functionsManager = new ServiceAppActions();
  functionsManager.init(function (err, appServiceClient) {

    if (err) {
      return res.status(400).send('There was an error initializing hdinsight manager:\n' + err);
    }

    appServiceClient.start(function (err, result) {

      if (err) {
        return res.status(400).send('There was an error starting the function app:\n' + err);
      }

      console.log('Creating hdinsight...');
      res.send("completed successfully");
    });

  });

});

router.post('/stop', function(req, res) {
  
  var functionsManager = new ServiceAppActions();
  functionsManager.init(function (err, appServiceClient) {

    if (err) {
      return res.status(400).send('There was an error initializing hdinsight manager:\n' + err);
    }

    appServiceClient.stop(function (err, result) {

      if (err) {
        return res.status(400).send('There was an error stopping hdinsight manager:\n' + err);
      }

      console.log('Creating hdinsight...');
      res.send("completed successfully");
    });

  });

});

module.exports = router;