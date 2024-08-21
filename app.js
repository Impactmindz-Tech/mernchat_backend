const express = require("express");
const cors = require("cors");
const { connectDB } = require("./db/config");
const Users = require("./models/Users");
const bcryptjs = require("bcryptjs");
const Conversation = require("./models/conversation");

const app = express();
const port = (process.env.PORT = 8000);

connectDB();
app.use(express.json());
app.use(cors());
// routes

app.use(express.urlencoded({ extended: false }));
app.get("/", (req, res) => {
  res.send("welcome");
});

app.post("/api/register", async (req, res) => {
  try {
    const { fullname, email, password } = req.body;
    if (!fullname || !email || !password) {
      return res.status(400).send("Please fill all required fields");
    }

    const alreadyExists = await Users.findOne({ email });
    if (alreadyExists) {
      return res.status(400).send("User already exists");
    }
    const hash = bcryptjs.hashSync(password, 10);
    const user = new Users({
      email: email,
      password: hash,
      fullname: fullname,
    });

    await user.save();
    return res.status(200).send({ user, message: "User registered successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).send("Server error");
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      res.status(400).send("Please fill all required fields");
    } else {
      const user = await Users.findOne({ email });
      if (!user) {
        return res.status(400).send("User already exists");
      } else {
        const validator = await bcryptjs.compare(password, user.password);
        if (!validator) {
          res.status(400).send("email or password incorrect");
        } else {
          res.status(200).send({ user, message: "login successfuly" });
        }
      }
    }
  } catch (error) {
    console.log(error);
    return res.status(500).send("Server error");
  }
});

app.post("/api/conversation", async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    const newConversation = new Conversation({ members: [senderId, receiverId] });
    await newConversation.save();
    res.status(200).send("conversation created successfully");
  } catch (error) {
    console.log(error);
  }
});

app.get("/api/conversation/:userId", async (req, res) => {
  try {
    const userId = req.params?.userId;
    const conversation = await Conversation.find({ members: { $in: [userId] } });
    res.status(200).json(conversation);
  } catch (error) {
    console.log(error);
  }
});

app.listen(port, () => {
  console.log("listening on port " + port);
});
