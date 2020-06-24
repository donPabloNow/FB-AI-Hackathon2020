# Flux
A fully voice controlled song recommender and player for Spotify powered by wit.ai and the Spotify API

## Inspiration
As a music lover with experience in accessibility, I was excited to build something that could combine my passion for music with the ability to help those with disabilities.

## What it does
Flux is a fully voice controlled interface for Spotify. Users can use voice commands and the site will interpret the request and fulfill it in an open Spotify player. For example, a use can say "play some Kanye", and Flux will query Spotify for songs related the the term "Kanye", users can also be specific by asking something like "play rocket man by elton john". Flux can also handle requests related to various audio features that are tracked in Spotify, so the request "play a lit song" will query songs with high danceability and energy. Additionally, Flux has control of your Spotify playback and can pause, play, and skip songs at your request. 

## How I built it
The web application is built with an AngularJS frontend and Node.js for backend functionality. To extract audio and process language I used JavaScript MediaStreams and sent the data to a wit.ai instance. I Leveraged the Spotify API to handle song recommendations and interfacing with active devices. The microphone audio visualization is built with p5.js.

## Challenges I ran into
Having never used wit.ai or any sort of natural language processing tools, there was some learning curve in figuring how to set up my wit instance and how to train the ai.

## Accomplishments that I'm proud of
I was proud of how quickly I learned new technologies and was able to use them to build a real product. It was really exciting to build something that I want to use on a daily basis.

## What I learned
I learned a lot about wit.ai and training instances, plus lots of details with asynchronous functions with node.js API calls. 

## What's next for Flux
I hope to expand Flux's understanding of more complex requests and compound phrases. I also want to find a way to bring Flux's functionality to a more widespread platform or a completely internal player, rather than relying on a secondary application. 

# Demo
https://fluxdj.herokuapp.com/
