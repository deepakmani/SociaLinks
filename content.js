$(document).ready(function() {
	if( window.location.href.match(/https:\/\/www.linkedin.com\/vsearch\/p\//) != null)
	{
			// 1. Load array with names and status id
		chrome.storage.local.get(["tweet_user_summary", "check_linkedin_connections"], function(result) {
			// 2. For each array element
			// 3. Check the user's connection level on page 1
			// 4. If there is a match
			// 5. Send message to background script and update the connection level

			// 6. Send message to background script that all the profiles have been checked

			// 7. Set check_linkedin_connections to false
		});
	}

});