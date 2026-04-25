const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const port = process.env.PORT || 5000;

// parse options
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser())
app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}))

// routes
const articleRoutes = require("./src/routes/article.route")
const commentRoutes = require("./src/routes/comment.route")
const userRoutes = require("./src/routes/auth.user.route")
const notificationRoutes = require("./src/routes/notification.route")
const subscriptionRoutes = require("./src/routes/subscription.route")
app.use("/api/articles", articleRoutes)
app.use("/api/comments", commentRoutes)
app.use("/api/auth", userRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/subscriptions", subscriptionRoutes)
// app.use('/api/plagiarism', require('./src/routes/plagiarismRoutes'));

// // In your index.js or App.js
// useEffect(() => {
//   // Load Facebook SDK
//   window.fbAsyncInit = function() {
//     window.FB.init({
//       appId: process.env.REACT_APP_FACEBOOK_APP_ID,
//       cookie: true,
//       xfbml: true,
//       version: 'v18.0'
//     });
//   };

//   // Load script
//   (function(d, s, id) {
//     var js, fjs = d.getElementsByTagName(s)[0];
//     if (d.getElementById(id)) return;
//     js = d.createElement(s); js.id = id;
//     js.src = "https://connect.facebook.net/en_US/sdk.js";
//     fjs.parentNode.insertBefore(js, fjs);
//   }(document, 'script', 'facebook-jssdk'));
// }, []);

async function main() {
  await mongoose.connect(process.env.MONGODB_URL);

  app.get('/', (req, res) => {
    res.send('PubShark server is running...')
  })
}

main().then(() => console.log("MongoDB connected successfully!")).catch(err => console.log(err));

app.listen(port, () => {
  console.log(`PubShark listening on port ${port}`)
})
