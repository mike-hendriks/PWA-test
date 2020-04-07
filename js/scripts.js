//See if the browser supports Service Workers, if so try to register one
if("serviceWorker" in navigator){
  navigator.serviceWorker.register("service-worker.js").then(function(registering){
    // Registration was successful
    console.log("Browser: Service Worker registration is successful with the scope",registering.scope);
  }).catch(function(error){
    //The registration of the service worker failed
    console.log("Browser: Service Worker registration failed with the error",error);
  });
}else { 
  //The registration of the service worker failed
  console.log("Browser: I don't support Service Workers :(");
}

//Asking for permission with the Notification API
if(typeof Notification!==typeof undefined){ //First check if the API is available in the browser
	Notification.requestPermission().then(function(result){ 
		//If accepted, then save subscriberinfo in database
		if(result==="granted"){
			console.log("Browser: User accepted receiving notifications, save as subscriber data!");
			navigator.serviceWorker.ready.then(function(serviceworker){ //When the Service Worker is ready, generate the subscription with our Serice Worker's pushManager and save it to our list
				const VAPIDPublicKey="BK2cTqo2duEEBRo2LBBoaDvrVo_prXTVBTXtqzLNd9IaANIkJGikJPmc_xllVakoNERWGNTHFLbXQRfujlzv1fM"; // Fill in your VAPID publicKey here
				const options={applicationServerKey:VAPIDPublicKey,userVisibleOnly:true} //Option userVisibleOnly is neccesary for Chrome
				serviceworker.pushManager.subscribe(options).then((subscription)=>{
          //POST the generated subscription to our saving script (this needs to happen server-side, (client-side) JavaScript can't write files or databases)
					let subscriberFormData=new FormData();
					subscriberFormData.append("json",JSON.stringify(subscription));
					fetch("data/saveSubscription.php",{method:"POST",body:subscriberFormData});
				});
			});
		}
	}).catch((error)=>{
		console.log(error);
	});
}

//Setup libraries we want to use (installed them first with *npm install*)
const webpush = require("web-push");
const fetch = require("node-fetch");
const prompts = require("prompts");

//Location of your subscribers file (normally they would be in a database)
const yourSubscriberJSONFileURL =
  "PUT THE FULL LOCATION OF YOUR SUBSCRIBERS LIST JSON FILE IN HERE (INCLUDING HTTP://)";

//Place your keys here
webpush.setVapidDetails(
  "PUSH IT REAL GOOD", //Subject VAPID
  "BK2cTqo2duEEBRo2LBBoaDvrVo_prXTVBTXtqzLNd9IaANIkJGikJPmc_xllVakoNERWGNTHFLbXQRfujlzv1fM", // Public Key VAPID
  "-13zLpiMGLoqC3Z5wKtDSbSrxt9KR3u41RSXORb6_tU" //Private Key VAPID
);

console.log(
  " ==========================================\n",
  "==       SEND PUSH NOTIFICATION         ==\n",
  "==========================================\n"
);

//This allows you to fill in the titel and message of the notification in the CLI
const questions = [
  {
    type: "text",
    name: "title",
    message: "Push notification title"
  },
  {
    type: "text",
    name: "message",
    message: "Push notification message"
  }
];

(async () => {
  const answers = await prompts(questions);

  console.log(
    "\n ==========================================\n",
    "==    SENDING MESSAGE TO SUBSCRIBERS    ==\n",
    "==========================================\n"
  );

  //Putting the promted title and message in variables to use
  let pushTitle = answers.title;
  let pushMessage = answers.message;

  //Send a notification to every subscriber
  fetch(yourSubscriberJSONFileURL)
    .then(subscriberJSON => subscriberJSON.json())
    .then(subscriberJSON => {
      for (let subscriberEndpoint in subscriberJSON) {
        //Setting up format of subcription for sending
        const pushSubscription = {
          endpoint: subscriberEndpoint,
          keys: {
            auth: subscriberJSON[subscriberEndpoint]["keys"]["auth"],
            p256dh: subscriberJSON[subscriberEndpoint]["keys"]["p256dh"]
          }
        };
        //Actual sending
        webpush
          .sendNotification(
            pushSubscription,
            `{"title":"${pushTitle}","message":"${pushMessage}"}`
          )
          .then(result => {
            console.log(`-- Message send to ${pushSubscription.endpoint}`);
          })
          .catch(error => {
            console.log(`-- Message NOT send to ${pushSubscription.endpoint}`);
          });
      }
    });
})();