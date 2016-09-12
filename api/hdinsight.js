
var api = { console: { autoLoad: true} };

var express = require('express');
var router = api.router = express.Router();
var docRouter = require('docrouter').docRouter;
var ManageHDInsight = require('../lib/manage-hdinsight');

module.exports = api;

docRouter(router, '/api/hdinsight', function (router) {

  router.post('/create', function(req, res) {
    
    var hdinsightManager = new ManageHDInsight();
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

  },
    {
      id: 'hdinsight_create',
      name: 'create',
      usage: 'hdinsight create',
      example: 'hdinsight create',
      doc: 'creating the hdinsight cluster',
      params: { }
    });

  router.get('/get', function (req, res) {
    
    var hdinsightManager = new ManageHDInsight();
    hdinsightManager.init(function (err) {

      if (err) {
        return res.status(400).send('There was an error initializing hdinsight manager:\n' + err);
      }

      console.log('Creating hdinsight...');
      hdinsightManager.checkHDInsight(function (err, result) {

        if (err) {
          if (err.code == 'ResourceNotFound') {
            console.error('Resource not found: ' + err);
            return res.json({
              status: 'ResourceNotFound',
              error: err
            });
          } else {
            return res.status(400).send('There was an error creating hdinsight manager:\n' + err);
          }
        }

        console.log('hdinsight created successfully');
        if (result && result.cluster && result.cluster.properties && result.cluster.properties.provisioningState) {
          return res.json({
            status: result.cluster.properties.provisioningState,
            result: result
          });
        } else {
          var error = new Error('The resulting resource is not in an expected format: ' + result);
          console.error(error);
          return res.json({
            status: 'Unknown',
            error: error,
            result: result
          });
        }
      });
    });
  },
    {
      id: 'hdinsight_get',
      name: 'get',
      usage: 'hdinsight get',
      example: 'hdinsight get',
      doc: 'getting the hdinsight cluster',
      params: { }
    });

  router.delete('/destroy', function(req, res) {
    
    var hdinsightManager = new ManageHDInsight();
    hdinsightManager.init(function (err) {

      if (err) {
        return res.status(400).send('There was an error initializing hdinsight manager:\n' + err);
      }

      console.log('Deleting hdinsight...');
      hdinsightManager.deleteHDInsight(function (err) {

        if (err) {
          return res.status(400).send('There was an error creating hdinsight manager:\n' + err);
        }

        console.log('hdinsight deleted successfully');
        res.send("Destroyed successfully");
      });
    });

  },
    {
      id: 'hdinsight_destroy',
      name: 'destroy',
      usage: 'hdinsight destroy',
      example: 'hdinsight destroy',
      doc: 'destroying the hdinsight cluster',
      params: { }
    });

});
