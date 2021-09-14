//jshint esversion:6

// GOAL: Use APIs to either return indoor or outdoor activities
// depending on the area's weather

// in order to use import we need "type": "modules" in package.json
import {} from 'dotenv/config'
import usStates from "./states.js"

import express from "express";
const app = express();
app.use(express.static('public'))
// need for rendering EJS templates from views folder
app.set('view engine', 'ejs');

import weather from "weather-js";

import yelp from "yelp-fusion";
const client = yelp.client(process.env.YELP_API_KEY);


import bodyParser from "body-parser";
app.use(bodyParser.urlencoded({extended: true}));

app.get("/",function(req,res){
    res.render("home")
});


// Depending on weather choose either outdoor or indoor places to go

app.post("/activity",function(req,res){

    // case that the user selects either indoor or outdoor regardless of weather
    const userOption = (req.body.btn);

    const city = (req.body.cityName);
    const state = (req.body.stateName).toUpperCase();

    const location = city+","+state;

    const found = usStates.find(x => x.name === state || x.abbreviation === state);

    if(found){
        // Weather-js
        // Options:
        // search: location name or zipcode
        // degreeType: F or C

        // Returns today's weather and 5 day forecast
        weather.find({search: location, degreeType: 'F'}, function(err, result) {
            if(!err){
                // returns first location that matches the search
                let skycode = (JSON.stringify(result[0].current.skycode, null, 2));
                // remove the "" from string "num"
                skycode = skycode.replace(/"/g,'');
                // make string into int
                skycode = parseInt(skycode)

                console.log(skycode)

                if(userOption ==="indoor"){
                    skycode = 1;
                }else if (userOption === "outdoor"){
                    skycode = 23;
                }

                console.log(skycode + " "+ userOption)

                // 23,24 - Windy XX // 27,29,33 - Partly Cloudy (night)
                // 28,30,34 - Partly Cloudy // 31 - Clear (night) XX
                // 32 - Clear XX  // 36 - Hot XX  
                // 25,26,35

            

                //conditional statement for verifying if weather is good or not
                if(((22 < skycode) && (skycode < 37)) && (skycode !== 25 || skycode !== 26 || skycode !== 35) ) {
                    
                    // searches for "outdoor" events
                    // outdoor specified in "categories:" with given categories
                    // https://www.yelp.com/developers/documentation/v3/event_search
                    var night;
                    if(skycode === 27 || skycode === 29 || skycode === 33 ||
                        skycode === 31 || skycode === 45 || skycode === 47){
                        
                        console.log("Its night time")
                        night = "nightlife"
                    }else{
                        night = null;
                    }

                    console.log("The weather is nice, lets do something outside")
                    
                    client.eventSearch({
                        categories: night + " || sports-active-life || music || festivals-fairs || food-and-drink",
                        location: location,
                        radius: 25000,
                        limit: 6
                    }).then(response => {
                        var eventsArray = response.jsonBody.events;
                        eventsArray.forEach((event)=>{
                            console.log(event.name)
                        })

                        

                        res.render("events",{
                            events: eventsArray
                        })

                    }).catch(e => {
                        console.log(e);
                    });  
                    
                   
                    
                    
                }
                else{
                    // Yelp-API

                    // Generates a name of restaurant in city
                    // NOTE: handle error... look at documentation(.catch())
                    // https://www.yelp.com/developers/documentation/v3/business_search

                    console.log("Do something indoors...");
                    
                    client.search({
                        location: location,
                        limit: 10
                    }).then(response => {
                        // returns businesses that matches search
                        var businessesArray = (response.jsonBody.businesses);
                        
                        
                        // Orders in ascending order by rating
                        businessesArray = businessesArray.sort((a,b)=>{
                            return b.rating-a.rating;
                        })
                        var top6Businesses = businessesArray.slice(0,6)
                        
                        res.render("indoors",{
                            events: top6Businesses
                        })

                        
                        
                        }).catch(e => {
                            console.log(e);
                        });
                     
                }   
            }
        });

    }else{
        console.log("Not in the US")

        // eventually res.render("error");


        res.redirect("/");
    }
     

});


let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port, ()=>{
    console.log("Successfully started on port")
});

