import { forum, user as userCollectionFn } from '../config/mongoCollections.js';
import { ObjectId } from 'mongodb';
import { validateIdField } from '../helpers.js';
import { getUserById } from './user.js';

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

const getChildComments = async (processedCommentList, pId) => {
  let childCommentList = [];
  for (let processedComment of processedCommentList) {
    if (processedComment["parentId"] != null && processedComment["parentId"].toString() == pId.toString()) {
      processedComment["childrenCommentList"] = await getChildComments(processedCommentList, processedComment["_id"]);
      childCommentList.push(processedComment);
    }
  }
  return childCommentList;
};
const getCommentTree = async (processedCommentList, pId) => {
  let commentTree = processedCommentList.filter((comment) => pId == null || comment["parentId"] == null ? comment["parentId"] == pId : comment["parentId"].toString() == pId.toString());

  for (let comment of commentTree) {
    comment["childrenCommentList"] = await getChildComments(processedCommentList, comment["_id"]);
  }
  return commentTree;
};

const collectIdsFromCommentTreeNodes = (nodes) => {
  const out = [];
  for (const n of nodes) {
    if (!n || !n._id) continue;
    let oid = n._id;
    if (!(oid instanceof ObjectId)) oid = new ObjectId(oid.toString());
    out.push(oid);
    const kids = n.childrenCommentList;
    if (kids && kids.length) out.push(...collectIdsFromCommentTreeNodes(kids));
  }
  return out;
};

const getCommentSubtreeObjectIdsForPull = async (commentList, rootIdStr) => {
  const rootOid = new ObjectId(rootIdStr);
  const descendantTree = await getChildComments(commentList, rootOid);
  return [rootOid, ...collectIdsFromCommentTreeNodes(descendantTree)];
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
    const postIdStr = p._id.toString();
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
    if (p.isDeleted && (!title || !body)) {
      title = 'Post deleted';
      body = 'Post deleted';
    }

    let isMine = false;
    if (currentUserIdStr) {
      isMine = p.userId.toString() === currentUserIdStr;
    }

    // Comment Tree Assembling

    let processedCommentList = p.commentList;
    if (!processedCommentList) processedCommentList = [];
    for (let comment of processedCommentList) {
      const userOb = await getUserById(comment["userId"].toString());
      comment["isMine"] = comment["userId"].toString() === currentUserIdStr;
      comment["authorUsername"] = userOb["username"]; // Give the front end usernames to render
      const likedC = emptyIfMissing(comment["likedUserIdList"]);
      const dislikedC = emptyIfMissing(comment["dislikedUserIdList"]);
      comment["likeCount"] = likedC.length;
      comment["dislikeCount"] = dislikedC.length;
      comment["_idStr"] = comment["_id"].toString();
      comment["_postIdStr"] = postIdStr;
      if (comment["isDeleted"] === undefined || comment["isDeleted"] === null) comment["isDeleted"] = false;
    }
    // console.log(processedCommentList); // TODO REMOVE
    

    // childrenCommentList
    let commentTree = await getCommentTree(processedCommentList, null);

    // console.log(commentTree);
    // console.log(JSON.stringify(commentTree, null, 2));

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
      commentTree: commentTree
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
  if (post.isDeleted) throw new Error('Cannot like a deleted post');

  const uid = new ObjectId(userIdStr);
  const liked = emptyIfMissing(post.likedUserIdList);
  const inLiked = liked.some((id) => id.equals(uid));

  if (inLiked) {
    await forumCollection.updateOne({ _id: new ObjectId(postId) }, { $pull: { likedUserIdList: uid } });
  } else {
    await forumCollection.updateOne(
      { _id: new ObjectId(postId) },
      { $addToSet: { likedUserIdList: uid }, $pull: { dislikedUserIdList: uid } },
    );
  }
  return getPostById(postId);
};

export const toggleDislikePost = async (postId, userId) => {
  postId = await validateIdField(postId);
  const userIdStr = normalizeUserIdString(userId);
  await validateIdField(userIdStr);

  const forumCollection = await forum();
  const post = await forumCollection.findOne({ _id: new ObjectId(postId) });
  if (!post) throw new Error('Post not found');
  if (post.isDeleted) throw new Error('Cannot dislike a deleted post');

  const uid = new ObjectId(userIdStr);
  const disliked = emptyIfMissing(post.dislikedUserIdList);
  const inDisliked = disliked.some((id) => id.equals(uid));

  if (inDisliked) {
    await forumCollection.updateOne({ _id: new ObjectId(postId) }, { $pull: { dislikedUserIdList: uid } });
  } else {
    await forumCollection.updateOne(
      { _id: new ObjectId(postId) },
      { $addToSet: { dislikedUserIdList: uid }, $pull: { likedUserIdList: uid } },
    );
  }
  return getPostById(postId);
};

const validateCommentBody = (body) => {
  if (typeof body !== 'string' || !body.trim()) throw new Error('Comment body is required');
  if (body.trim().length > 5000) throw new Error('Comment is too long');
  return body.trim();
};

const findCommentInPost = (post, commentIdStr) => {
  const list = emptyIfMissing(post.commentList);
  const cid = new ObjectId(commentIdStr);
  for (let i = 0; i < list.length; i++) {
    if (list[i]._id && list[i]._id.equals(cid)) return list[i];
  }
  return null;
};

export const addCommentToPost = async (postId, userId, body, parentIdStr) => {
  postId = await validateIdField(postId);
  const userIdStr = normalizeUserIdString(userId);
  await validateIdField(userIdStr);
  body = validateCommentBody(body);

  const forumCollection = await forum();
  const post = await forumCollection.findOne({ _id: new ObjectId(postId) });
  if (!post) throw new Error('Post not found');
  if (post.isDeleted) throw new Error('Cannot comment on a deleted post');

  let parentId = null;
  if (parentIdStr && String(parentIdStr).trim()) {
    parentIdStr = await validateIdField(String(parentIdStr).trim());
    const parent = findCommentInPost(post, parentIdStr);
    if (!parent) throw new Error('Parent comment not found');
    if (parent.isDeleted) throw new Error('Cannot reply to a deleted comment');
    parentId = new ObjectId(parentIdStr);
  }

  const newComment = {
    _id: new ObjectId(),
    dateTimeCreated: new Date(),
    userId: new ObjectId(userIdStr),
    parentId,
    childrenCommentIdList: [],
    body,
    likedUserIdList: [],
    dislikedUserIdList: [],
    isDeleted: false,
  };

  await forumCollection.updateOne({ _id: new ObjectId(postId) }, { $push: { commentList: newComment } });
  return getPostById(postId);
};

export const toggleLikeComment = async (postId, commentId, userId) => {
  postId = await validateIdField(postId);
  commentId = await validateIdField(commentId);
  const userIdStr = normalizeUserIdString(userId);
  await validateIdField(userIdStr);

  const forumCollection = await forum();
  const post = await forumCollection.findOne({ _id: new ObjectId(postId) });
  if (!post) throw new Error('Post not found');
  if (post.isDeleted) throw new Error('Cannot like on a deleted post');

  const c = findCommentInPost(post, commentId);
  if (!c) throw new Error('Comment not found');
  if (c.isDeleted) throw new Error('Cannot like a deleted comment');

  const uid = new ObjectId(userIdStr);
  const commentOid = new ObjectId(commentId);
  const liked = emptyIfMissing(c.likedUserIdList);
  const inLiked = liked.some((id) => id.equals(uid));

  if (inLiked) {
    await forumCollection.updateOne(
      { _id: new ObjectId(postId) },
      { $pull: { 'commentList.$[c].likedUserIdList': uid } },
      { arrayFilters: [{ 'c._id': commentOid }] },
    );
  } else {
    await forumCollection.updateOne(
      { _id: new ObjectId(postId) },
      { $addToSet: { 'commentList.$[c].likedUserIdList': uid }, $pull: { 'commentList.$[c].dislikedUserIdList': uid } },
      { arrayFilters: [{ 'c._id': commentOid }] },
    );
  }
  return getPostById(postId);
};

export const toggleDislikeComment = async (postId, commentId, userId) => {
  postId = await validateIdField(postId);
  commentId = await validateIdField(commentId);
  const userIdStr = normalizeUserIdString(userId);
  await validateIdField(userIdStr);

  const forumCollection = await forum();
  const post = await forumCollection.findOne({ _id: new ObjectId(postId) });
  if (!post) throw new Error('Post not found');
  if (post.isDeleted) throw new Error('Cannot dislike on a deleted post');

  const c = findCommentInPost(post, commentId);
  if (!c) throw new Error('Comment not found');
  if (c.isDeleted) throw new Error('Cannot dislike a deleted comment');

  const uid = new ObjectId(userIdStr);
  const commentOid = new ObjectId(commentId);
  const disliked = emptyIfMissing(c.dislikedUserIdList);
  const inDisliked = disliked.some((id) => id.equals(uid));

  if (inDisliked) {
    await forumCollection.updateOne(
      { _id: new ObjectId(postId) },
      { $pull: { 'commentList.$[c].dislikedUserIdList': uid } },
      { arrayFilters: [{ 'c._id': commentOid }] },
    );
  } else {
    await forumCollection.updateOne(
      { _id: new ObjectId(postId) },
      { $addToSet: { 'commentList.$[c].dislikedUserIdList': uid }, $pull: { 'commentList.$[c].likedUserIdList': uid } },
      { arrayFilters: [{ 'c._id': commentOid }] },
    );
  }
  return getPostById(postId);
};

export const deleteCommentByUser = async (postId, commentId, userId) => {
  postId = await validateIdField(postId);
  commentId = await validateIdField(commentId);
  const userIdStr = normalizeUserIdString(userId);
  await validateIdField(userIdStr);

  const forumCollection = await forum();
  const post = await forumCollection.findOne({ _id: new ObjectId(postId) });
  if (!post) throw new Error('Post not found');

  const c = findCommentInPost(post, commentId);
  if (!c) throw new Error('Comment not found');
  if (!c.userId || c.userId.toString() !== userIdStr) throw new Error('You can only delete your own comment');

  const list = post.commentList || [];
  const objectIdsToPull = await getCommentSubtreeObjectIdsForPull(list, commentId);

  await forumCollection.updateOne(
    { _id: new ObjectId(postId) },
    { $pull: { commentList: { _id: { $in: objectIdsToPull } } } },
  );
  return true;
};

export const removeCommentSubtreeFromPost = async (postId, commentId) => {
  postId = await validateIdField(postId);
  commentId = await validateIdField(commentId);

  const forumCollection = await forum();
  const post = await forumCollection.findOne({ _id: new ObjectId(postId) });
  if (!post) throw new Error('Post not found');

  const c = findCommentInPost(post, commentId);
  if (!c) throw new Error('Comment not found');

  const list = post.commentList || [];
  const objectIdsToPull = await getCommentSubtreeObjectIdsForPull(list, commentId);

  await forumCollection.updateOne(
    { _id: new ObjectId(postId) },
    { $pull: { commentList: { _id: { $in: objectIdsToPull } } } },
  );
  return true;
};

export const deletePostByUser = async (postId, userId) => {
  postId = await validateIdField(postId);
  const userIdStr = normalizeUserIdString(userId);
  await validateIdField(userIdStr);

  const forumCollection = await forum();
  const post = await forumCollection.findOne({ _id: new ObjectId(postId) });
  if (!post) throw new Error('Post not found');

  if (!post.userId || post.userId.toString() !== userIdStr) throw new Error('You can only delete your own post');

  const del = await forumCollection.deleteOne({ _id: new ObjectId(postId), userId: new ObjectId(userIdStr) });
  if (del.deletedCount === 0) throw new Error('Post not found');
  return true;
};

export { createPost };
