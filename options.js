// Name: Options.js
// Descr: Run by options.html

// Global Variables
var twitter_search_queries_db;
var tweets_db;
var idb_tweet_count; // Tweets stored into IndexedDb
var idb_tweet_exception_count;


// Angular module for SociaLinks
var app = angular.module("sociaLinks", ['ngRoute']).value('$anchorScroll', angular.noop);

// Define routes
app.config(['$routeProvider',
		function($routeProvider) {

			$routeProvider
			.when('/',
			{
				templateUrl: '/partials/search_twitter.html',
				controller: 'searchTwitterController'
			})
			.otherwise({
					redirectTo: "/"
			}); // Define routes

		}]); //config route provider  


var controllers = {};
var factories  	= {};


// Name: searchTwitterController
// Descr: Save search query if needed and search twitter api
controllers.searchTwitterController = function($scope, $q) {

	// Initialize 
	//$scope.search_query_exists = true;
	//$scope.tweets_present 	   = true;

	// Tweets DB
	chrome.runtime.getBackgroundPage(function(bgPage) {
		tweets_db = bgPage.tweets_db;
		// Twitter Search Queries DB
		chrome.runtime.getBackgroundPage(function(bgPage) {
			twitter_search_queries_db = bgPage.twitter_search_queries_db;
		
			
			// Show first search_query
			show_tweets($scope, $q, "onload");

			// 1. Create method for ng-click Search Button searchTwitter()
			$scope.searchTwitter = function() {
				// 2. Take data-ng-model directive
				// Validations
				// Check if the query is not empty

				var update_search = false;

				var search_query = {
									query: 				$scope.new_twitter_search_query, 
									exclude_keywords: 	$scope.excludeKeywords,
									search_id: 			0, // initialize
									since_id: 			0, // initialize
									language: 			"",
									country: 			""
								};

				// 3. If a query exists, update it 
				twitter_search_queries_db.transaction("twitter_search_queries").objectStore("twitter_search_queries").
					get(search_query.query).onsuccess = function(event) {
		 			
		 			// If query exists
		 			if (event.target.result != undefined) 
		 			{
		 				// Show flash indicating "Updating Query" if exclude_keywords has changed
		 				search_query.search_id = event.target.result.search_id;
		 				search_query.since_id  = event.target.result.since_id;

		 				// Update search if exclude keywords have changed
						if (JSON.stringify(event.target.result.exclude_keywords.sort()) == JSON.stringify($scope.excludeKeywords.sort()))
							update_search = true; 
		 			}
		 			else 
		 			{
		 				// Show flash indicating a new query was created

		 			}

		 			add_search_query(search_query, $q)
		 			.then(

		 					function(v) {
		 						// Update list
		 						//var index = $scope.search_query_list.indexOf(v);
		 						//$scope.splice(index, 1);
		 						//$scope.search_query_list.unshift(v);
		 						//$scope.search_query_select 	= $scope.search_query_list[0];						

		 					},
		 					function(err) {
		 						//
		 					}
		 			);

		 			

					// 4. Search Twitter
					search_twitter(search_query, $q, update_search)
					.then(
						function(v) { 
							return get_tweets(search_query.query, $q);
						}, 
						function(err)
						{
							// No Tweets added
							return get_tweets(search_query.query, $q);
						}
					)
					.then(
						function(v) { 
							show_tweets($scope, $q, search_query); 
						},
						function(err) { $scope.tweets = err}
					);	
						

					// Show loading spinner

					// Set searching_status to 1
		 				
				}; // Check indexedDb if query exists
				
			} // searchTwitter ng-click handler

			$scope.selectQuery = function(search_query_select){

				show_tweets($scope, $q, search_query_select);
		    }  // selectQuery - on Change handler 

		    // 1. Create method for ng-click add Exclude Keyword Button
			$scope.addExcludeKeyword = function($event) {
				
				// Add excludeKeyword if not white space
				if ($scope.excludeKeyword.match(/^\s*$/) == null) 
					$scope.excludeKeywords.unshift($scope.excludeKeyword);

				// Empty input field
				$scope.excludeKeyword = "";
			} // addExcludeKeyword

			  // Create method for ng-click removeExcludeKeyword Button
			$scope.removeExcludeKeyword = function(excludeKeyword) {
					
				// 1. Find excludeKeyword
				var index = $scope.excludeKeywords.indexOf(excludeKeyword);

				// 2. Remove exclude keyword
				$scope.excludeKeywords.splice(index, 1);
			} // removeExcludeKeyword

			// deleteSearchQuery
			$scope.deleteSearchQuery = function() {
			
				var search_query = $scope.search_query_select;

				// 1. Remove Search Query from twitter_search_queries db
				delete_search_query(search_query.query, $q)
				.then(
						function(v) { 
							// 2. Remove all tweets from query
							console.log("Nemam Amma Bhagavan Sharanam -- Deleted Search Query");
							return delete_tweets_by_query(search_query.query, $q);
						},						
						function(err)
						{
							// No Tweets added
							console.log("Nemam Amma Bhagavan Sharanam -- Woops");
						}
					)
				.then(
						function(v) {
							// Move to next twitter_search_query if it exists 
							console.log("Nemam Amma Bhagavan Sharanam -- Deleted tweets -- showing first tweet");

							show_tweets($scope, $q, "onload");
						},
						function(err) {

						}
					);
				
			} // deleteSearchQuery ngClick
		});  // Open twitter search queries db
	}); // Open Tweets DB



} // searchTwitter Controller for the Search Twitter Route

// Name: show_tweets
// Descr: Show the initial set of tweets
function show_tweets($scope, $q, search_query) 
{
	twitter_search_queries_db.transaction("twitter_search_queries").objectStore("twitter_search_queries").
				count().onsuccess = function(e) {
					var num_search_queries = e.target.result;

					// initialize array for storing exclude Keywords
					$scope.excludeKeywords 	   = new Array();

					if (num_search_queries > 0) 
					{	
						// ng-show - Display search queries and tweets
						$scope.search_query_exists 	= true;
						$scope.search_query_list 	= [];

						get_twitter_search_queries($q).then(
							function(v) { 
								$scope.search_query_list = v; 

								// Display the first tweet
								if (search_query == "onload") $scope.search_query_select = $scope.search_query_list[0];

								// Select the search query
								else 
								{
									for (var i = 0; i < $scope.search_query_list.length; i++) 
									{
										if (search_query.query == $scope.search_query_list[i].query) 
										{
											$scope.search_query_select = $scope.search_query_list[i];
											break;
										}
									}
								}
								

								// Show select tag in query field if it exists
								$scope.new_twitter_search_query 	= $scope.search_query_select.query; 

								// Show Exclude Keywords if they exist
								$scope.excludeKeywords = $scope.search_query_select.exclude_keywords;

								// Update tweets from indexedDB 
								get_tweets($scope.search_query_select.query, $q)
								.then(
									function(v) { 
										console.log("Nemam Amma Bhagavan Sharanam -- Num Tweets" + v.num_tweets);
										// Check if there are tweets
										if(v.num_tweets == 0)
										{
											// Show flash indicating no tweets
											console.log("Nemam Amma Bhagavan Sharanam -- No Tweets found");
											$scope.tweets_present = false;
											
										}
										else
										{
											console.log("Nemam Amma Bhagavan Sharanam -- Tweets found");											
											$scope.tweets_present = true;
											$scope.tweets = v.tweets;
										}
									},
									function(err) { $scope.tweets = err}
								); // get_tweets promise call
							}, // get_twitter_search_queries 
							function(err) {
							 $scope.search_query_list = err
							}
						); // get_twitter_search_queries

						
					} // if num_search_queries > 0
					else {
						// ng-hide - Show the message to add search queries
						// don't show select tag with list of tweets and the delete icon
						console.log("Nemam Amma Bhagavan Sharanam -- No more search queries");
						$scope.search_query_exists 	= false;

						// If no query exists then don't show select field
						// Show text field asking user to add a Search Query
					}
				} // Count on success
} 
// Name: delete_tweets_by_query
// Descr: Delete tweets by query

function delete_tweets_by_query(query, $q) {
	var q  	  			= $q.defer();
	var index 			= tweets_db.transaction(["tweets"], "readwrite").objectStore("tweets").index("query, status_id");
	var boundedKeyRange = IDBKeyRange.bound([query, ""], [query, "Z"]);
	index.openCursor(boundedKeyRange).onsuccess = function(event) {
		var tweet_cursor = event.target.result;
		if (tweet_cursor) {
		  	// Delete Request for deleting tweet
		    var request = tweet_cursor.delete();
		    request.onsuccess = function() {
		     	console.log("Nemam Amma Bhagavan Sharanam -- Deleted Tweet");
		    };
		    // Move to the next tweet
		    tweet_cursor.continue();
	  	} // if cursor is valid
	  	else {
	  		// All tweets are deleted
	    	console.log("Nemam Amma Bhagavvan Sharanam -- No more entries!");
	    	q.resolve("All Tweets are deleted");
	  	} // Else cursor is null

	} // OpenCursor
	return q.promise;
} // delete_tweets_by_query

// Name: delete_tweets_by_search_id
// Descr: Delete tweets by search_id when we are updating a search
function delete_tweets_by_search_id($q, query, search_id) {
	var q  	  			= $q.defer();
	var index 			= tweets_db.transaction(["tweets"], "readwrite").objectStore("tweets").index("query, search_id, status_id");
	var boundedKeyRange = IDBKeyRange.bound([query, search_id, 0], [query, search_id, ""]);
	index.openCursor(boundedKeyRange).onsuccess = function(event) {
		var tweet_cursor = event.target.result;
		if (tweet_cursor) {
		  	// Delete Request for deleting tweet
		    var request = tweet_cursor.delete();
		    request.onsuccess = function() {
		     	console.log("Nemam Amma Bhagavan Sharanam -- Deleted Tweet");
		    };
		    // Move to the next tweet
		    tweet_cursor.continue();
	  	} // if cursor is valid
	  	else {
	  		// All tweets are deleted
	    	console.log("Nemam Amma Bhagavvan Sharanam -- No more entries!");
	    	q.resolve("All Tweets are deleted");
	  	} // Else cursor is null

	} // OpenCursor
	return q.promise;
} // delete_tweets_by_search_id

// Name: delete_search_query
// Desc: Open IndexedDB, find search query
//       based on query and call delete on it
function delete_search_query(query, $q) 
{
	var q 		= $q.defer();

	var request = twitter_search_queries_db.transaction(["twitter_search_queries"], "readwrite")
                  .objectStore("twitter_search_queries")
	              .delete(query);

	request.onsuccess 	= function(event) {
 	 // It's gone!
 		q.resolve("Deleted");
	}
	request.onerror 	= function (event) {
		q.reject("Error in deleting");
	}

	return q.promise;

} // delete_search_query

app.factory("getTweetsFactory", function(query, $q) {
	var factory = {};

	factory.getTweets = function() {

		var q = $q.defer();

		var transaction 	= tweets_db.transaction(["tweets"],"readwrite");
		
		var store 			= transaction.objectStore("tweets");
		console.log("Nemam Amma Bhagavan Sharanam -- Query is " + query); 
		// Open index
		var index 			= store.index("query, status_id");
		var boundedKeyRange = IDBKeyRange.bound([query, 0], [query, ""]);
		var tweets_array 	= new Array();
		
		// Asynchronous method to search tweets table and return the 
		// tweets array after all the entries are searched
		index.openCursor(boundedKeyRange, "prev").onsuccess = function(e) {
		    var tweet_cursor = e.target.result;
		    if(tweet_cursor) {
		    	
				tweet_cursor.continue();
			}
			else {
				console.log("Amma Bhagavan Sharanam -- Updating tweets");
				// Resolve the promise if there is no error 
				 q.resolve(tweets_array);
			}
		} // openCursor on success
		return q.promise;	
	} // getTweets method inside factory
	return factory;
});

app.controller(controllers); 
app.factory(factories);


// Name: get_tweets
// Descr: Create an array with a  list of tweets for a search query from IndexedDB
function get_tweets(query, $q) {
	var q = $q.defer();

	var transaction 	= tweets_db.transaction(["tweets"],"readonly");
	
	var store 			= transaction.objectStore("tweets");
	console.log("Nemam Amma Bhagavan Sharanam -- Query is " + query); 

	// Open index
	var index 			= store.index("query, status_id");
	var boundedKeyRange = IDBKeyRange.bound([query, ""], [query, "Z"]);
	var tweets_array 	= new Array();
	
	// Asynchronous method to search tweets table and return the 
	// tweets array after all the entries are searched
	index.openCursor(boundedKeyRange, "prev").onsuccess = function(e) {
	    var tweet_cursor = e.target.result;
	    if(tweet_cursor) {
	    	
			tweets_array.push(tweet_cursor.value);
			tweet_cursor.continue();
		}
		else {
			// Resolve the promise if there is no error 
			console.log("Nemam Amma Bhagavan Sharanam -- " +  tweets_array.length);
			 q.resolve({tweets: tweets_array, num_tweets: tweets_array.length});
		}
	} // openCursor on success
	
	return q.promise;

} // get_tweets

// Name: get_search_queries
// Descr: Create an array with a  list of search_queries for a search query from IndexedDB
function get_twitter_search_queries($q) {

	console.log("Nemam Amma Bhagavan Sharanam -- Calling get_twitter_search_queries");

	var q = $q.defer();

	var transaction 	= twitter_search_queries_db.transaction(["twitter_search_queries"],"readwrite");
	
	var store 			= transaction.objectStore("twitter_search_queries");
	// Open index
	var index 			= store.index("since_id");
    var boundedKeyRange = IDBKeyRange.bound(0, "");
	var search_queries_array 	= new Array();
	
	// Asynchronous method to search tweets table and return the 
	// tweets array after all the entries are searched
	index.openCursor().onsuccess = function(e) {
	    var search_query_cursor = e.target.result;
	    if(search_query_cursor) {
	    	
			search_queries_array.push(search_query_cursor.value);
			search_query_cursor.continue();
		}
		else {
			// Resolve the promise if there is no error 
			 q.resolve(search_queries_array);
		}
	} // openCursor on success
	return q.promise;
} // get_twitter_search_queries

// Name: add_search_query
// Descr: Add a search query to indexedDB
//        Returns a promise to the search_query that was added to update the list
function add_search_query(search_query, $q)
{

	var q = $q.defer();
	
	try {
	

		var transaction = twitter_search_queries_db.transaction(["twitter_search_queries"],"readwrite");
		
		var store = transaction.objectStore("twitter_search_queries");
		
		// Perform the add
		// data, key
		var addRequest = store.put(search_query);
		
		// Event listener for the add function
		addRequest.onerror = function(e) {
			console.log("Error putting:" + e.target.error.name);
		} // on error callback
	 	
		addRequest.onsuccess = function(e) {
			console.log("Nemam Amma Bhagavan Sharanam -- Storing the twitter search query");
			
			q.resolve(search_query);
		} // on success callback

		transaction.oncomplete = function(e) {
			// The actual write is completed
			// Does this get fired after onsuccess/onerror?
			//idb_tweet_count += 1;

			// Update total_tweet count

		} // Transaction.oncomplete -- Successfully stored the data/errored
	} catch(exception) {
		console.log("Exception in Storing Twitter Search Query\n" + exception.message);
	} // try block for adding tweet

	return q.promise;
} // add_search_query method



// Name: Search Twitter
// Descr: Run the twitter API and store the tweets into the tweets db
//        Update the tweets scope in the show_tweets div
//        Returns promise with 
function search_twitter(search_query, $q, update_search) {

	var twitter = require('twit');
	var q 		= $q.defer(); // Promise for tweets returned from this method

	// Oauth client 
	var client  = new twitter({ consumer_key: "W4BsbvQJdEZtg27W0sAfAg",
			        consumer_secret: "3zbIFGQJv5QZyyWCGjUXiQzygnyV3P4YW3W3DFkpP0U",
			        access_token: "1724608555-R3MbqVjAatPIRFC3THNglH3BLOfO6MAjHlUW8nB",
			        access_token_secret: "IliBzpicbMOwo6BFVcOOxul3jUzDTE3nwPGqdSJFqybra",
 				 });

	// Create query
	var query 	= search_query.query;

	// Exclude keywords
	for (var i = 0; i < search_query.exclude_keywords.length; i++)
	{
		query = query + " -" + search_query.exclude_keywords[i];
	}

	console.log("Nemam Amma Bhagavan Sharanam -- Search Query is " + query);
    
	var since_id 					= search_query.since_id;
	var search_id 					= update_search ? Number(search_query.search_id) : Number(search_query.search_id + 1);
		idb_tweet_count  			= 0;
		idb_tweet_exception_count 	= 0; 

    // If exclude keyword changes then remove tweets with last search_id	
	delete_tweets_by_search_id($q, query, search_id)
		.then(
			function(v) { 
				// Twitter API call
				client.get('search/tweets', {q: query, count: 100, since_id: since_id}, function(err, data, response) {
			  		var tweets 		= data.statuses;
			  		var num_tweets	= tweets.length;

			  		for (var i = 0; i < num_tweets ; i++)
			  		{
			  			var user_name 			= tweets[i].user.name;
						var text 				= tweets[i].text;
						var user_screen_name 	= tweets[i].user.screen_name; // twitter handle
						var profile_image_url 	= tweets[i].user.profile_image_url; 
						var status_id 			= tweets[i].id_str; // status_id -> use id_str; id appears to be buggy
						var created_at 			= moment(tweets[i].created_at).unix();
	//						created_at 			= moment(created_at).unix();


						var tweet  = {
										user_name: 			user_name,
										text: 				text,
										user_screen_name: 	user_screen_name,
										profile_image_url: 	profile_image_url,
										status_id: 			status_id,
										created_at: 		created_at,
										query: 				search_query.query,
										search_id: 			search_id,
										linkedin_level:		""
									};		

						// asynchronous method to add tweets
						add_tweet(tweet);	

						if (i == 0)
						{	
							// Update the search_id and since_id for the search_query
							var updated_search_query 			= search_query;
							console.log("Nemam Amma Bhagavan Sharanam -- Update search query" + updated_search_query.query);
								updated_search_query.since_id 	= status_id; 	 // used to set parameter prior to searching 
								updated_search_query.search_id 	= Number(search_id) + 1; // used for popup.js

							add_search_query(updated_search_query, $q)
							.then(

					 					function(v) {
					 						//
					 					},
					 					function(err) {
					 						//
					 					}
					 			);
						}	// store first tweet as since_id
			  		} // For each tweets
			  		// Store users for checking linkedin

			  		// Check if all the tweets are stored
					var searchTweetsSetInt = setInterval(function() {
						
						console.log("Nemam Amma Bhagavan Sharanam -- Num Tweets" + num_tweets);
						// If there are no tweets added then no need to check
						if (num_tweets == 0)
						{
							// Display flash message on the  options page
							console.log("No New Tweets added");
							clearInterval(searchTweetsSetInt);
							q.reject("No Tweets Added");
						}
						else if (num_tweets == idb_tweet_count + idb_tweet_exception_count)  // Check if num_tweets ==  idb_tweets_added
						{
							// Update the scope for tweets
							
							clearInterval(searchTweetsSetInt);
							q.resolve("Tweet Stored");
							console.log("Nemam Amma Bhagavan Sharanam -- All tweets are stored Promise Resolved");
						}
						else {
							// Do Nothing
							console.log("Nemam Amma Bhagavan Sharanam -- Total Tweets"  + num_tweets + " Stored Tweets:" + idb_tweet_count);
						}
					}, 100);
				}); // Client -> search tweets
			},
			function(err) { console.log("Nemam Amma Bhagavan Sharanam -- Unable to delete tweets")}
		); // delete_tweets promise call
		
	return q.promise; // Return promise for tweets 
}

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
			console.log("Nemam Amma Bhagavan Sharanam -- Storing the tweet" + tweet.user_name);
		} // on success callback


		transaction.oncomplete = function(e) {
			// The actual write is completed
			// Does this get fired after onsuccess/onerror?
			idb_tweet_count += 1;

			// Update total_tweet count

		} // Transaction.oncomplete -- Successfully stored the data/errored
	} catch(exception) {
		console.log("Exception in Storing Tweets\n" + exception.message);
		idb_tweet_exception_count += 1;
	} // try block for adding tweet

} // Add tweet function

