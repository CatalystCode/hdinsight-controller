var azure = require("azure-storage");

/*
 * Defining a new azure queue
 * 
 * [string] queueName - name of the queue
 * [object] config                      - configuration for queue
 * [object] config.storage              - configuration for queue storage
 * [string] config.storage.account  - storage account name
 * [string] config.storage.key   - storage account key
 * [object] config.queue                - queue configuration inside stoarge
 * [number] config.queue.visibilityTimeout - message hide timeout in queue
 * 
 */
function Queue(queueName, config) {

  var queueService;

  function init(cb) {
    cb = cb || Function();
    
    queueService = azure.createQueueService(config.storage.account, config.storage.key)
      .withFilter(new azure.ExponentialRetryPolicyFilter());
    
    return queueService.createQueueIfNotExists(queueName, function(err) {
      if (err) return cb(err);
      
      console.info('listening on queue', queueName);
      return cb(null, queueService);
    });
  }

  function getSingleMessage(cb) {
    cb = cb || Function;

    return queueService.getMessages(queueName, { 
        numofmessages: 1, 
        visibilitytimeout: config.queue.visibilityTimeout || 2 * 60
      },
      function (err, messages) {
        if (err) return cb(err);
        var message = messages && messages.length && messages[0]; 
        return cb(null, message);
      }
    );
  };

  function deleteMessage(message, cb) {
    cb = cb || Function;

    return queueService.deleteMessage(queueName,
      message.messageId,
      message.popReceipt, 
      cb
    );
  };

  function sendMessage(message, cb) {
    cb = cb || Function;

    return queueService.createMessage(queueName,
      JSON.stringify(message),
      cb);
  };

  return {
    init: init,
    getSingleMessage: getSingleMessage,
    deleteMessage: deleteMessage,
    sendMessage: sendMessage,
    config: config,
    name: queueName
  };
};

module.exports = Queue;