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

export const getAllPostsForDisplay = async (catagoryFilter, q, currentUserId, onlyUserId) => {
  let posts = await getAllPosts();

  let filter = 'all';
  if (typeof catagoryFilter === 'string') filter = catagoryFilter.trim();
  if (!FORUM_CATEGORIES.includes(filter)) filter = 'all';

  let search = '';
  if (typeof q === 'string') search = q.trim().toLowerCase();

  let currentUserIdStr = '';
  if (typeof currentUserId === 'string') currentUserIdStr = currentUserId.trim();

  let onlyUserIdStr = '';
  if (typeof onlyUserId === 'string') onlyUserIdStr = onlyUserId.trim();
  if (onlyUserIdStr) {
    const filteredPosts = [];
    for (let i = 0; i < posts.length; i++) {
      if (posts[i].userId && posts[i].userId.toString() === onlyUserIdStr) filteredPosts.push(posts[i]);
    }
    posts = filteredPosts;
  }

  if (filter !== 'all') {
    const filteredPosts = [];
    for (let i = 0; i < posts.length; i++) {
      if (posts[i].catagory === filter) filteredPosts.push(posts[i]);
    }
    posts = filteredPosts;
  }

  if (search) {
    const filteredPosts = [];
    for (let i = 0; i < posts.length; i++) {
      const title = posts[i].title;
      const body = posts[i].body;
      let titleText = '';
      let bodyText = '';
      if (typeof title === 'string') titleText = title.toLowerCase();
      if (typeof body === 'string') bodyText = body.toLowerCase();
      if (titleText.indexOf(search) !== -1 || bodyText.indexOf(search) !== -1) filteredPosts.push(posts[i]);
    }
    posts = filteredPosts;
  }

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

    let title = p.title;
    let body = p.body;
    if (p.isDeleted) {
      title = 'Post deleted by user';
      body = 'Post deleted by user';
    }

    let isMine = false;
    if (currentUserIdStr) {
      isMine = p.userId.toString() === currentUserIdStr;
    }

    out.push({
      _idStr: p._id.toString(),
      catagory: p.catagory,
      dateTimeCreated: p.dateTimeCreated,
      dateTimeISO,
      dateTimeLabel,
      userId: p.userId.toString(),
      authorUsername,
      title,
      body,
      likeCount: liked.length,
      dislikeCount: disliked.length,
      isDeleted: Boolean(p.isDeleted),
      isMine,
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

export const deletePostByUser = async (postId, userId) => {
  postId = await validateIdField(postId);
  const userIdStr = normalizeUserIdString(userId);
  await validateIdField(userIdStr);

  const forumCollection = await forum();
  const post = await forumCollection.findOne({ _id: new ObjectId(postId) });
  if (!post) throw new Error('Post not found');

  if (!post.userId || post.userId.toString() !== userIdStr) throw new Error('You can only delete your own post');

  await forumCollection.updateOne(
    { _id: new ObjectId(postId) },
    { $set: { isDeleted: true, deletedAt: new Date(), deletedByUserId: new ObjectId(userIdStr), title: 'Post deleted by user', body: 'Post deleted by user' } },
  );
  return true;
};

export { createPost };
