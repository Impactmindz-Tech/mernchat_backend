const express = require("express");
const cors = require("cors");
const { connectDB } = require("./db/config");
const Users = require("./models/Users");
const bcryptjs = require("bcryptjs");
const Conversation = require("./models/conversation");
const Messages = require("./models/Messages");
const io = require("socket.io")(8080, {
  cors: {
    origin: "http://localhost:5173", // Remove the trailing slash
    methods: ["GET", "POST"], // Optional: Specify allowed methods
    credentials: true, // Optional: Allow credentials (cookies, authorization headers, etc.)
  },
});

const app = express();
const port = (process.env.PORT = 8000);

connectDB();
app.use(express.json());
app.use(cors());
// routes

let users = [];
io.on("connection", (socket) => {
  console.log("user connected", socket.id);
  socket.on("addUser", (userId) => {
    const isUserExist = users.find((user) => user.userId === userId);
    if (!isUserExist) {
      const user = { userId, socketId: socket.id };
      users.push(user);
      io.emit("getUsers", users);
    }
  });
  // io.emit('getUsers' , socket.userId)
});

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
    const conversationUserData = Promise.all(
      conversation.map(async (conversations) => {
        const receiverId = conversations.members.find((member) => member !== userId);
        const user = await Users.findById(receiverId);
        return { user: { receiverId: user?._id, email: user.email, fullname: user.fullname }, conversationId: conversations._id };
      })
    );
    res.status(200).json(await conversationUserData);
  } catch (error) {
    console.log(error);
  }
});

app.post("/api/message", async (req, res) => {
  try {
    const { conversationId, senderId, message, receiverId = "" } = req.body;
    if (!senderId || !message) {
      return res.status(400).send("please fill all required fields");
    }
    if (conversationId === "new" && receiverId) {
      const newConversation = new Conversation({ members: [senderId, receiverId] });
      await newConversation.save();
      const newMessage = new Messages({ conversationId: newConversation._id, senderId, message });
      await newMessage.save();
      return res.status(200).send("message send successfully");
    } else if (!conversationId && !receiverId) {
      return res.status(400).send("please fill all required fields");
    }
    const newMessage = new Messages({ conversationId, senderId, message });
    await newMessage.save();
    res.status(200).send({ message: "message sent succesfully", data: newMessage });
  } catch (error) {
    console.log(error);
  }
});

// app.get("/api/message/:conversationId", async (req, res) => {
//   try {
//     const checkMessagess = async () => {
//       const messages = await Messages.find({ conversationId });
//       const messageData = Promise.all(
//         messages.map(async (messages) => {
//           const user = await Users.findById(messages.senderId);
//           // return { user: { email: user.email, fullname: user.fullname }, message: messages.message };
//           return { user: { id: user._id, email: user.email, fullname: user.fullname }, message: messages.message };
//         })
//       );
//       res.status(200).json(await messageData);
//     };
//     const conversationId = req.params.conversationId;
//     if (conversationId == "new") {
//       const checkConversation = await Conversation.find({ members: { $all: [req.query.senderId, req.query.receiverId] } });
//       if (checkConversation.length > 0) {
//         checkMessagess(checkConversation[0]._id);
//       } else {
//         return res.status(200).json([]);
//       }
//     } else {
//       checkMessagess(conversationId);
//     }
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ error: "An error occurred while fetching messages" });
//   }
// });

app.get("/api/message/:conversationId", async (req, res) => {
  try {
    const conversationId = req.params.conversationId;

    const checkMessages = async (conversationId) => {
      // Fetch messages for the provided conversationId
      const messages = await Messages.find({ conversationId });

      // Map over the messages to include user details
      const messageData = await Promise.all(
        messages.map(async (message) => {
          const user = await Users.findById(message.senderId);
          return { user: { id: user._id, email: user.email, fullname: user.fullname }, message: message.message };
        })
      );

      // Send response with conversationId and messages
      res.status(200).json({ conversationId, messages: messageData });
    };

    if (conversationId === "new") {
      // If the conversationId is "new", find an existing conversation
      const checkConversation = await Conversation.find({ members: { $all: [req.query.senderId, req.query.receiverId] } });

      if (checkConversation.length > 0) {
        // Fetch messages for the existing conversation
        checkMessages(checkConversation[0]._id);
      } else {
        // If no conversation found, respond with an empty array
        res.status(200).json({ conversationId, messages: [] });
      }
    } else {
      // Fetch messages for the existing conversation
      checkMessages(conversationId);
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "An error occurred while fetching messages" });
  }
});

app.get("/api/users/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await Users.find({ _id: { $ne: userId } });
    // const user = await Users.find();
    const userData = Promise.all(
      user.map(async (user) => {
        return { user: { email: user.email, fullname: user.fullname, receiverId: user?._id } };
      })
    );
    res.status(200).json(await userData);
  } catch (error) {
    console.log(error);
  }
});

app.listen(port, () => {
  console.log("listening on port " + port);
});
