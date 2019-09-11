const usersCollection = require("../db")
  .db()
  .collection("Users");
const followsCollection = require("../db")
  .db()
  .collection("follows");
const ObjectID = require("mongodb").ObjectID;
const User = require("./User");

let Follow = function(followedUsername, authorId) {
  this.followedUsername = followedUsername;
  this.authorId = authorId;
  this.errors = [];
};

Follow.prototype.cleanUp = function() {
  if (typeof this.followedUsername != "string") {
    this.followedUsername = "";
  }
};

Follow.prototype.validate = async function(action) {
  // followed username must exist in db
  let followedAccount = await usersCollection.findOne({
    username: this.followedUsername
  });
  if (followedAccount) {
    this.followedId = followedAccount._id;
  } else {
    this.errors.push("You cannot follow a user that does not exist!");
  }
  let doesFollowAlreadyExist = await followsCollection.findOne({
    followedId: this.followedId,
    authorId: new ObjectID(this.authorId)
  });
  if (action == "create") {
    if (doesFollowAlreadyExist) {
      this.errors.push("You are Already following this user!");
    }
  }
  if (action == "delete") {
    if (!doesFollowAlreadyExist) {
      this.errors.push(
        "You cannot stop following someone you are not following!"
      );
    }
  }
  //   should not be able to follow self
  if (this.followedId.equals(this.authorId)) {
    this.errors.push("you cannot follow yourself");
  }
};

Follow.prototype.create = function() {
  return new Promise(async (resolve, reject) => {
    this.cleanUp();
    await this.validate("create");
    if (!this.errors.length) {
      await followsCollection.insertOne({
        followedId: this.followedId,
        authorId: new ObjectID(this.authorId)
      });
      resolve();
    } else {
      reject(this.errors);
    }
  });
};

Follow.prototype.delete = function() {
  return new Promise(async (resolve, reject) => {
    this.cleanUp();
    await this.validate("delete");
    if (!this.errors.length) {
      await followsCollection.deleteOne({
        followedId: this.followedId,
        authorId: new ObjectID(this.authorId)
      });
      resolve();
    } else {
      reject(this.errors);
    }
  });
};

Follow.isVisitorFollowing = async function(followedId, visitorId) {
  let followDoc = await followsCollection.findOne({
    followedId: followedId,
    authorId: new ObjectID(visitorId)
  });
  if (followDoc) {
    return true;
  } else {
    return false;
  }
};

Follow.getFollowersById = function(id) {
  return new Promise(async (resolve, reject) => {
    try {
      let followers = await followsCollection
        .aggregate([
          { $match: { followedId: id } },
          {
            $lookup: {
              from: "Users",
              localField: "authorId",
              foreignField: "_id",
              as: "userDoc"
            }
          },
          {
            $project: {
              username: { $arrayElemAt: ["$userDoc.username", 0] },
              email: { $arrayElemAt: ["$userDoc.email", 0] }
            }
          }
        ])
        .toArray();
      followers = followers.map(function(follower) {
        let user = new User(follower, true);
        return { username: follower.username, avatar: user.avatar };
      });
      resolve(followers);
    } catch {
      reject();
    }
  });
};

Follow.getFollowingById = function(id) {
  return new Promise(async (resolve, reject) => {
    try {
      let followings = await followsCollection
        .aggregate([
          { $match: { authorId: id } },
          {
            $lookup: {
              from: "Users",
              localField: "followedId",
              foreignField: "_id",
              as: "userDoc"
            }
          },
          {
            $project: {
              username: { $arrayElemAt: ["$userDoc.username", 0] },
              email: { $arrayElemAt: ["$userDoc.email", 0] }
            }
          }
        ])
        .toArray();
      followings = followings.map(function(following) {
        let user = new User(following, true);
        return { username: following.username, avatar: user.avatar };
      });
      resolve(followings);
    } catch {
      reject();
    }
  });
};

Follow.countFollowersById = function(id) {
  return new Promise(async (resolve, reject) => {
    let followerCount = await followsCollection.countDocuments({
      followedId: id
    });
    resolve(followerCount);
  });
};

Follow.countFollowingById = function(id) {
  return new Promise(async (resolve, reject) => {
    let count = await followsCollection.countDocuments({ author: id });
    resolve(count);
  });
};

module.exports = Follow;
