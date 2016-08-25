var express = require('express');
var ManageHDInsight = require('../lib/manage-hdinsight');

var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res) {
  res.send('respond with a resource');
});

router.post('/create', function(req, res) {
  
  var config = null;

  try {
    config = require('../lib/config');
  } catch (e) {
    return res.status(400).send("There was an error reading configuration: " + e.message);
  }

  console.log('Initializing hdinsight manager...');
  var hdinsightManager = new ManageHDInsight(config);
  hdinsightManager.init(function (err) {

    if (err) {
      return res.status(400).send('There was an error initializing hdinsight manager:\n' + err);
    }

    console.log('Creating hdinsight...');
    hdinsightManager.createHDInsight(function (err) {

      if (err) {
        return res.status(400).send('There was an error creating hdinsight manager:\n' + err);
      }

      console.log('hdinsight created successfully');
      res.send("completed successfully");
    });
  });

});

module.exports = router;
