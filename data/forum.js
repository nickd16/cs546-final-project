import { forum, user as userCollectionFn } from '../config/mongoCollections.js';
import { ObjectId } from 'mongodb';
import { validateIdField } from '../helpers.js';

const FORUM_CATEGORIES = ['all', 'tennis', 'basketball', 'handball', 'hiking'];

const validateCategory = (cat) => {
  if (typeof cat !== 'string' || !FORUM_CATEGORIES.includes(cat.trim())) throw new Error('Invalid forum category');
  return cat.trim();
};

const validateTitleAndBody = (title, body) => {
  if (typeof title !== 'string' || !title.trim()) throw new Error('Title is required');
  if (typeof body !== 'string' || !body.trim()) throw new Error('Post body is required');
  if (title.trim().length > 200) throw new Error('Title is too long');
  if (body.trim().length > 10000) throw new Error('Post body is too long');
  return [title.trim(), body.trim()];
};

const normalizeUserIdString = (userId) => {
  if (userId && typeof userId === 'object' && typeof userId.toString === 'function') return userId.toString();
  return String(userId);
};

const emptyIfMissing = (arr) => {
  if (!arr) return [];
  return arr;
};

export const getPostById = async (id) => {
  id = await validateIdField(id);
  const forumCollection = await forum();
  const post = await forumCollection.findOne({ _id: new ObjectId(id) });
  if (!post) throw new Error('Post not found');
  return post;
};

export const getAllPosts = async () => {
  const forumCollection = await forum();
  return forumCollection.find({}).sort({ dateTimeCreated: -1 }).toArray();
};

export const getAllPostsForDisplay = async () => {
  const posts = await getAllPosts();
  const uidStrings = [...new Set(posts.map((p) => p.userId.toString()))];
  const userMap = {};
  const userCollection = await userCollectionFn();
  for (const uid of uidStrings) {
    try {
      const u = await userCollection.findOne({ _id: new ObjectId(uid) });
      if (u && u.username) userMap[uid] = u.username;
      else userMap[uid] = 'Unknown';
    } catch (err) {
      userMap[uid] = 'Unknown';
    }
  }

  const out = [];
  for (let i = 0; i < posts.length; i++) {
    const p = posts[i];
    const key = p.userId.toString();
    let authorUsername = userMap[key];
    if (authorUsername === undefined || authorUsername === null) authorUsername = 'Unknown';

    let dateTimeISO = '';
    let dateTimeLabel = '';
    if (p.dateTimeCreated instanceof Date) {
      dateTimeISO = p.dateTimeCreated.toISOString();
      dateTimeLabel = p.dateTimeCreated.toLocaleString();
    } else {
      dateTimeLabel = String(p.dateTimeCreated);
    }

    const liked = emptyIfMissing(p.likedUserIdList);
    const disliked = emptyIfMissing(p.dislikedUserIdList);

    out.push({
      _idStr: p._id.toString(),
      catagory: p.catagory,
      dateTimeCreated: p.dateTimeCreated,
      dateTimeISO,
      dateTimeLabel,
      userId: p.userId.toString(),
      authorUsername,
      title: p.title,
      body: p.body,
      likeCount: liked.length,
      dislikeCount: disliked.length,
    });
  }
  return out;
};

const createPost = async (userId, catagory, title, body) => {
  const userIdStr = normalizeUserIdString(userId);
  await validateIdField(userIdStr);
  catagory = validateCategory(catagory);
  const parts = validateTitleAndBody(title, body);
  title = parts[0];
  body = parts[1];
  const forumCollection = await forum();
  const doc = {
    catagory,
    dateTimeCreated: new Date(),
    userId: new ObjectId(userIdStr),
    commentList: [],
    title,
    body,
    likedUserIdList: [],
    dislikedUserIdList: [],
  };
  const result = await forumCollection.insertOne(doc);
  return getPostById(result.insertedId.toString());
};

export const toggleLikePost = async (postId, userId) => {
  postId = await validateIdField(postId);
  const userIdStr = normalizeUserIdString(userId);
  await validateIdField(userIdStr);

  const forumCollection = await forum();
  const post = await forumCollection.findOne({ _id: new ObjectId(postId) });
  if (!post) throw new Error('Post not found');

  const uid = new ObjectId(userIdStr);
  let liked = emptyIfMissing(post.likedUserIdList).slice();
  let disliked = emptyIfMissing(post.dislikedUserIdList).slice();
  const inLiked = liked.some((id) => id.equals(uid));

  if (inLiked) liked = liked.filter((id) => !id.equals(uid));
  else {
    liked.push(uid);
    disliked = disliked.filter((id) => !id.equals(uid));
  }

  await forumCollection.updateOne({ _id: new ObjectId(postId) }, { $set: { likedUserIdList: liked, dislikedUserIdList: disliked } });
  return getPostById(postId);
};

export const toggleDislikePost = async (postId, userId) => {
  postId = await validateIdField(postId);
  const userIdStr = normalizeUserIdString(userId);
  await validateIdField(userIdStr);

  const forumCollection = await forum();
  const post = await forumCollection.findOne({ _id: new ObjectId(postId) });
  if (!post) throw new Error('Post not found');

  const uid = new ObjectId(userIdStr);
  let liked = emptyIfMissing(post.likedUserIdList).slice();
  let disliked = emptyIfMissing(post.dislikedUserIdList).slice();
  const inDisliked = disliked.some((id) => id.equals(uid));

  if (inDisliked) disliked = disliked.filter((id) => !id.equals(uid));
  else {
    disliked.push(uid);
    liked = liked.filter((id) => !id.equals(uid));
  }

  await forumCollection.updateOne({ _id: new ObjectId(postId) }, { $set: { likedUserIdList: liked, dislikedUserIdList: disliked } });
  return getPostById(postId);
};

export { createPost };
