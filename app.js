//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

require("dotenv").config();
const username = process.env.DB_USERNAME;
const password = process.env.DB_PASSWORD;

const app = express();

app.set("view engine", "ejs");

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(express.static("public"));

mongoose.set("strictQuery", false);
mongoose
  .connect(
    `mongodb+srv://${username}:${password}@cluster0.oxekhtl.mongodb.net/todolistDB?retryWrites=true&w=majority`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("MongoDB Atlas Connected"))
  .catch((err) => console.log(err));

const itemsSchema = {
  //making new schema
  name: String,
};

const Item = mongoose.model("Item", itemsSchema); //the model for the schema, "item" == singular form

//the default itmes, when you start
const item1 = new Item({
  name: "Welcome to your todolist!",
});

const item2 = new Item({
  name: "Hit the + button to add a new item.",
});

const item3 = new Item({
  name: "<-- Hit this to delete an item.",
});

const defaultItems = [item1, item2, item3];

const listSchema = {
  name: String,
  items: [itemsSchema],
};
//creating a model("List") from "listSchema" for every new list we create, by just by typing "http://localhost:3000/xxxxxx"
const List = mongoose.model("List", listSchema); //"List" is the singular form of our collection

//GET:
app.get("/", async (req, res) => {
  try {
    const foundItems = await Item.find({}); //finding all the items inside "Item" collection

    if (foundItems.length === 0) {
      //if there are no items
      await Item.insertMany(defaultItems);
    } else {
      console.log("Default items");
    }

    res.render("list", {
      //rendering the items on the page
      listTitle: "Today",
      newListItems: foundItems,
    });
  } catch (e) {
    console.log(e);
  } finally {
    console.log("done!");
  }
});

app.get("/:customListName", async (req, res) => {
  const customListName = _.capitalize(req.params.customListName);
  console.log(customListName);

  await List.findOne({
    name: customListName,
  }).then((foundList) => {
    if (!foundList) {
      //create new list
      const list = new List({
        //new list based on the "List" model
        name: customListName, //the name user puts as a title for the list
        itmes: defaultItems, //populated by default with the "defaultItems" array
        //"items" is from "listSchema"
      });
      list.save();
      res.redirect("/" + customListName);
    } else {
      res.render("list", {
        listTitle: foundList.name,
        newListItems: foundList.items,
      });
    }
  });
});

//POST:
app.post("/", function (req, res) {
  const itemName = req.body.newItem; //saving what we put in the "input"
  const listName = req.body.list;

  const item = new Item({
    //the "Schema"
    name: itemName,
  });

  if (listName === "Today") {
    item.save();
    res.redirect("/");
  } else {
    List.findOne({
      name: listName,
    }).then((foundList) => {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }
});

app.post("/delete", async (req, res) => {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName; //the name of the custom list

  if (listName === "Today") {
    await Item.findByIdAndRemove(checkedItemId);
    console.log("Successfully deleted the checked item!");
    res.redirect("/");
  } else {
    await List.findOneAndUpdate(
      {
        name: listName,
      },
      {
        $pull: {
          //"$pull" operator needed for updating
          items: {
            //from "items" array
            _id: checkedItemId, //with the specified 'id' item (querry)
          },
        },
      },
      {
        new: true,
      }
    )
      .then(res.redirect("/" + listName))
      .catch((err) => {
        console.log(err);
      });
  }
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
