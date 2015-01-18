
// Open the tweets indexedDB
// If the user is running for the first time show a tutorial page
open_tweets_idb();

// Open the twitter_search_queries indexedDB
open_twitter_search_queries_idb();

// Global variables
var gcm_registrationId; // ID sent to server for registration
var gcm_tweet_count; // Tweets sent during a GCM
var time_window;
var idb_tweet_count; // Tweets stored into IndexedDb
var tweets_db; // The tweets database
var twitter_search_queries_db;  // search_queries_db

// STEP 1
// As soon as user has logged in 
// Check if a link is established with the server
// Get the registration id for the chrome extension
// Called when user reloads the extension
chrome.runtime.onInstalled.addListener(function() {
  console.log("Amma Bhagavan Sharanam - On Installed");
  chrome.storage.local.get("registered", function(result) {
    // If already registered, bail out.
    if (result["registered"])
      return;

    // Up to 100 senders are allowed.
    var senderIds = ["101636386530"];
    console.log("Calling GCM Register");
    chrome.gcm.register(senderIds, registerCallback);
  });
});

function gcm_test()
{
    // Up to 100 senders are allowed.
    var senderIds = ["101636386530"];
    console.log("Calling GCM Register");
    chrome.gcm.register(senderIds, registerCallback);
}



// STEP 2
// Perform Registration Callback and send a message
// to the server
function registerCallback(registrationId) {
  if (chrome.runtime.lastError) {
    console.log("Error:" + chrome.runtime.lastError.message);
    return;
  }

  console.log("Registration ID" + registrationId);
  gcm_registrationId = registrationId;


  // Send the registration ID to your application server.
  sendRegistrationId(function(succeed) {
      // Once the registration ID is received by your server,
      // set the flag such that register will not be invoked
      // next time when the app starts up.

      // Callback
      if (succeed) 
      {
        console.log("Amma Bhagavan Sharanam" + succeed);
        chrome.storage.local.set({registered: true});
      }
    });
}

// Send Registration ID to Server after logging in
function sendRegistrationId(callback) {
  // Send the registration ID to your application server
  // in a secure way.
  	$.ajax({
  			type: "POST",
  			url: "http://localhost:4000/register_gcm_client?gcm_registration_id="+ gcm_registrationId + "&user_id=" + 1,
       		dataType: 'json',
  			success: function(data) {
  				console.log("Amma Bhagavan Sharanam" + "Sent registration Id Staus:" + data.name);
          callback = true;

  			},
        error: function(data)
        {
          console.log("Amma Bhagavan Sharanam -- Error" + data.name);
        }

    }); // Ajax Request
}

// STEP 3
// Receive messages
chrome.gcm.onMessage.addListener(function(message) {

	if (message.data.type == "tweet_header")
	{

		console.log("Nemam Amma Bhagavan Sharanam -- Tweet Header" );
		gcm_tweet_count = 0; // Tweets Received
		idb_tweet_count = 0; // Tweets stored in indexedDB	

		search_window 	= 60 * 60 * 1000; // One hour in ms - Get from user

		// Initialize time window for tweets
		var time_end_unix 		= moment().utc().unix();
		var time_begin_unix 	= time_end_unix - search_window / 1000;
		time_window 			= time_begin_unix + "-" + time_end_unix;

	}
	
	// All tweets are received and stored into indexedDb
	else if(message.data.type == "tweet_footer")
	{
		// Wait for all the tweets to be added to indexedDb
		var idb_tweets_stored_setInt = setInterval(function(){

			if (gcm_tweet_count == idb_tweet_count)
			{
				// Launch LinkedIn
				console.log("Nemam Amma Bhagavan Sharanam -- Stored tweets into iDB" + gcm_tweet_count + " " + idb_tweet_count);
				chrome.tabs.create({url: "https://www.linkedin.com/vsearch/f", active:false})

				// ClearInterval
				clearInterval(idb_tweets_stored_setInt);
			 		
			} // All tweets are stored into IndexedDB

		}, 200); // Set Interval 
	} // All tweets are received
	else 
	{
		gcm_tweet_count++;
  		// A message is an object with a data property that
  		// consists of key-value pairs.
		var gcm_message = message;

		// For each tweet 
		// 1. Store tweet into indexed db
		var user_name 			= gcm_message.data.tweet.user_name;
		var text 				= gcm_message.data.tweet.text;
		var user_screen_name 	= gcm_message.data.tweet.user.screen_name;
		var profile_image_url 	= gcm_message.data.tweet.profile_image_url;
		var status_id 			= gcm_message.data.tweet.status_id;
		var created_at 			= gcm_message.data.tweet.created_at;

		var tweet  = {
						user_name: user_name,
						text: text,
						user_screen_name: user_screen_name,
						profile_image_url: profile_image_url,
						status_id: status_id,
						created_at: created_at,
						query: gcm_message.data.query
					}

		add_tweet(tweet);			

	 }
});


// Name: search_tweets
// Descr: Search Twitter for keywords and add to IndexedDB
function search_tweets() {

	// 1. Call twitter api
	// 2. Get tweets and store each tweet into indexeddb
	// 3. Launch LinkedIn 
    var twitter = require('twit');

    // Oauth client
	client  = new twitter({ consumer_key: "W4BsbvQJdEZtg27W0sAfAg",
					        consumer_secret: "3zbIFGQJv5QZyyWCGjUXiQzygnyV3P4YW3W3DFkpP0U",
					        access_token: "1724608555-R3MbqVjAatPIRFC3THNglH3BLOfO6MAjHlUW8nB",
					        access_token_secret: "IliBzpicbMOwo6BFVcOOxul3jUzDTE3nwPGqdSJFqybra",
         				 });

	// query - temp
	var query = "in-app messaging -rt -http -https";

	var search_id; // Used to display last search results in popup
	var since_id;  // Used to search tweets after the latest tweet

	var tweet_user_summary = new Array(); // User Name and status id for checking linkedin connection levels

	chrome.storage.local.get(["since_id", "search_id"], function(result) {
		since_id 	= result["since_id"];
		search_id 	= result["search_id"];	

		
		// Twitter API call
		client.get('search/tweets', {q: query, count: 100}, function(err, data, response) {
	  		var tweets 		 = data.statuses;
	  		console.log("Nemam Amma Bhagavan Sharanam Tweets Length:" + tweets.length);
	  		for (var i = 0; i < tweets.length; i++)
	  		{
	  			var user_name 			= tweets[i].user.name;
				var text 				= tweets[i].text;
				var user_screen_name 	= tweets[i].user.screen_name; // twitter handle
				var profile_image_url 	= tweets[i].user.profile_image_url; 
				var status_id 			= tweets[i].id;
				var created_at 			= tweets[i].created_at;


				var tweet  = {
								user_name: 			user_name,
								text: 				text,
								user_screen_name: 	user_screen_name,
								profile_image_url: 	profile_image_url,
								status_id: 			status_id,
								created_at: 		created_at,
								query: 				query,
								search_id: 			Number(search_id) + 1,
								linkedin_level:		""
							};

				console.log("Nemam Amma Bhagavan Sharanam -- since_id"  + since_id);
				console.log("Nemam Amma Bhagavan Sharanam -- search_id"  + search_id);
				tweet_user_summary.push({ name: user_name, status_id: status_id });		

				add_tweet(tweet);	

				if (i == 0)
				{	
					obj = {}
					obj["since_id"] = status_id;
					obj["search_id"] = search_id + 1;
					chrome.storage.local.set(obj, function(result) {
						if (chrome.runtime.lastError) {
							console.log("Error occurred: " + chrome.runtime.lastError.message);
						}
						else 
						{
							var options_window = chrome.extension.getViews({type:"tab"});
							if (options_window.length > 0) options_window[0].search_complete();
						}
		  			}); 
				}	// store first tweet as since_id
	  		} // For each tweets
	  		// Store users
	  		// Set the check connection level to true
	  		var obj = {};
             	obj["tweet_user_summary"] = tweet_user_summary;
             	obj["check_linkedin_connections"] = true;
            chrome.storage.local.set(obj, function(result) {
     			if (chrome.runtime.lastError) {
					console.log("Error occurred: " + chrome.runtime.lastError.message);
				}
				else 
				{
    			 	console.log("Nemam Amma Bhagavan Sharanam Stored user_summaries");
    			 	// Launch Linkedin and set the check connection level to true
    			 	var url ="https://www.linkedin.com/vsearch/p";
    			 	chrome.tabs.create({url: url, active:false, index: index});
    	 		}
	    	}); // 	  		
		}); // Client -> search tweets
	}); // chrome.storage.get Search Id and Since ID
} // search_tweets


// Name: Add tweet
// Descr: Store tweet into indexeddb
function add_tweet(tweet) {
	
	// Create the array of tables 
	// Most of the time will be one table

	try {
		var transaction = tweets_db.transaction(["tweets"],"readwrite");
		
		var store = transaction.objectStore("tweets");
		
		// Perform the add
		// data, key
		var addRequest = store.put(tweet);
		
		// Event listener for the add function
		addRequest.onerror = function(e) {
			console.log("Error putting:" + e.target.error.name);
			idb_error_count += 1;
		} // on error callback
	 	
		addRequest.onsuccess = function(e) {
			console.log("Nemam Amma Bhagavan Sharanam -- Storing the tweet");
		} // on success callback


		transaction.oncomplete = function(e) {
			// The actual write is completed
			// Does this get fired after onsuccess/onerror?
			idb_tweet_count += 1;

			// Update total_tweet count

		} // Transaction.oncomplete -- Successfully stored the data/errored
	} catch(exception) {
		console.log("Exception in Storing Tweets\n" + exception.message);
		idb_exception_count += 1;
	} // try block for adding tweet

} // Add tweet function


// Name: content script listener
// Descr: All tweets have been filtered by LinkedIn connection
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
   
    if (request.action == "linkedInFilterComplete") {
    	response = "Success";
    	show_tweet_search_notifier();
    	return true;
    }
});



// STEP 4
// Un-register GCM messages

function show_tweets_notifier()
{
	// 
		var opt = {
            type: "list",
            title: gcm_message.data.tweet_count + " New Tweets for " + gcm_message.data.query,
            message: gcm_message.data.tweet_count + " New Tweets for " + gcm_message.data.query,
            iconUrl: "/images/lance_mate_new.png",
            items: [{ title: "", message:""}],
            buttons: [{
                title: "View New Tweets",
                iconUrl: "/images/lance_mate_new.png"
             }, {
                title: "Amma Bhagavan Sharanam",
                iconUrl: "/images/lance_mate_new.png"
            }]
        };
  console.log("Amma Bhagavan Sharanam");
  var noti_id = "SociaLinks Noti" + moment().unix();
  chrome.notifications.create(noti_id, opt, creationCallback);
}

function creationCallback(){

  //console.log("Amma Bhagavan Sharanam: Notification Created");
}

// Name: open_tweets_idb
// Descr: Open the db for the tweets object store and define its indices
function open_tweets_idb() {
  
          
	idbSupported  	= false;
	idbReady  	 	= false;

	  // Check if browser supports indexeddb
	if(window.indexedDB) {
		idbSupported = true;
	}

 	if(idbSupported) {
  
	    // Version can be upgraded if we want another table here
	    var openRequest = indexedDB.open("tweets", 4);
	    

	    openRequest.onupgradeneeded = function(e) {

	    	var thisDB = e.target.result;

	    	if(!thisDB.objectStoreNames.contains("tweets")) {
	     	// Create the tweets store inside the tweets database for the first time
	        	var objectStore = thisDB.createObjectStore("tweets", { keyPath: "status_id" });
	       	} // Store Name

	     	// Version 1
	      	var transaction = e.currentTarget.transaction;

	     	var objectStore = transaction.objectStore("tweets");

	      	if (!objectStore.indexNames.contains("time_window, query")) {
	        	objectStore.createIndex("time_window, query",["time_window", "query"], {unique: false});
	       	}  

	       	// Version 2
	       	// Filter by Query and Status ID
	       	var transaction = e.currentTarget.transaction;

	     	var objectStore = transaction.objectStore("tweets");

	      	if (!objectStore.indexNames.contains("search_id, query")) {
	        	objectStore.createIndex("search_id, query",["search_id", "query"], {unique: false});
	       	}  

	       	// Version 2
	       	// Filter by Search Id, Query and Status Id for Popup.js
	      	var transaction = e.currentTarget.transaction;

	     	var objectStore = transaction.objectStore("tweets");

	      	if (!objectStore.indexNames.contains("query, search_id, status_id")) {
	        	objectStore.createIndex("query, search_id, status_id",["query", "search_id", "status_id"], {unique: false});
	       	}  
	       	
	       	// Version 3 
	       	// Filter by Query and status_id to display tweets in options.js
	      	var transaction = e.currentTarget.transaction;

	     	var objectStore = transaction.objectStore("tweets");

	      	if (!objectStore.indexNames.contains("query, status_id")) {
	        	objectStore.createIndex("query, status_id",["query", "status_id"], {unique: false});
	       	}  

	       

	       	// Delete Version 1
		    var transaction = e.currentTarget.transaction;
			var objectStore = transaction.objectStore("tweets");
		    if (objectStore.indexNames.contains("time_window, query")) objectStore.deleteIndex("time_window, query");


	    } // On upgrade needed

	    openRequest.onsuccess = function(e) {
		     console.log("Success!");
			 idbReady = true;

			 // Global variable -- Our DB

			 tweets_db = e.target.result;

		 } // onsuccess
		openRequest.onerror = function(e) {
		    console.log("Error");
		    console.dir(e);
			idbReady = false;
	  	} // onerror
 	} // idbSupported
 } // open_tweets_db

// Name: open_twitter_search_queries_idb
// Descr: Open the db for the twitter_search_queries object store and define its indices
function open_twitter_search_queries_idb() {
          
	idbSupported	= false;
	idbReady		= false;

	  // Check if browser supports indexeddb
	if(window.indexedDB) {
		idbSupported = true;
	}

 	if(idbSupported) {
  
	    // Version can be upgraded if we want another table here
	    var openRequest = indexedDB.open("twitter_search_queries", 3);
	    

	    openRequest.onupgradeneeded = function(e) {

	    	var thisDB = e.target.result;

	    	if(!thisDB.objectStoreNames.contains("twitter_search_queries")) {
	     	// Create the twitter_search_queries store inside the twitter_search_queries database for the first time
	        	var objectStore = thisDB.createObjectStore("twitter_search_queries", { keyPath: "query" });
	       	} // Store Name

	       	// Version 3
	      	var transaction = e.currentTarget.transaction;

	     	var objectStore = transaction.objectStore("twitter_search_queries");

	      	if (!objectStore.indexNames.contains("since_id")) {
	        	objectStore.createIndex("since_id",["since_id"], {unique: false});
	       	}   // Add since_id index

	    } // onupgrade needed

      	openRequest.onsuccess = function(e) {
		     console.log("Success!");
			 
			 // Global variable -- Our DB

			 twitter_search_queries_db = e.target.result;
		}
		openRequest.onerror = function(e) {
		    console.log("Error");
		    console.dir(e);
			idbReady = false;
	  	} // onerror
 	} // idbSupported
 } // open_tweets_idb