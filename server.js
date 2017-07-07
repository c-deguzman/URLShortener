var express = require('express');
var app = express();

var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;

var url = "mongodb://fcc:pass@ds119020.mlab.com:19020/url_shortener"


app.use(express.static('public'));

app.use(function(request, response, next) {
  response.header("Access-Control-Allow-Origin", "*");
  response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

// Pulled from SO
function checkUrl(str) {
   var regexp = /(http|https):\/\/(\w+:?\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
   return regexp.test(str);
}

function hasLetter(str){
  var regexp = /[a-z]/i;
  return regexp.test(str);
}

app.get("/serv", function (request, response){
  
  MongoClient.connect(url, function (err, db) {
    if (err) {
      console.log('Unable to connect to the mongoDB server. Error:', err);
      return;
    } else {
      console.log('Connection established to', url);
      
      db.collection('links', function(err, collection) {
        
        collection.count(function (err, count){
          if (err){
            response.send(err);
            throw err;
            return;
          }
          
          var short = count + 1;
          
          if (request.query.hasOwnProperty("desired-short")){
            short = request.query["desired-short"];
            
            if (!hasLetter(short)) {
              db.close();
              response.send({"error" : "name must contain an alphabetical character"});
            }         
          }
          
          
          collection.findOne({"short": short}, function (err, result){
            if (result){
              db.close();
              response.send({"error" : "name already taken"});
              return;
            }
            
            var attempt_url = request.query["base"];
            var return_json = {"short" : short, "base" : attempt_url};

            var override = false;

            if (request.query.hasOwnProperty("override")){
              override = request.query["override"];
            }


            if (!checkUrl(attempt_url) && override != "true"){
              db.close();
              response.send({"error" : "base url not formatted correctly"});
              return;
            }

            collection.insert(return_json, function (err, result){

              if (err){
                response.send(err);
                throw err;
                return;
              }

              db.close();
              response.send({"short" : "https://misty-iris.glitch.me/short/" + short, "base" : attempt_url});
            });
          });
        });  
      });
    }
  });
});

app.get("/short/:key", function (request, response) {
  MongoClient.connect(url, function (err, db) {
    if (err) {
      console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {
      console.log('Connection established to', url);
      
      db.collection('links', function(err, collection) {
        
        if (err){
          db.close();
          throw err;
          return;
        }
        
        collection.findOne({"short" : request.params.key}, function (err, result){
          if (err){
            db.close();
            throw err;
            return;
          }
          
          if (result){
            db.close();
            response.redirect(result.base);
          } else {
            response.send({"error" : "could not find short in database"});
          }
        });
      });
    }
  });
});


var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
