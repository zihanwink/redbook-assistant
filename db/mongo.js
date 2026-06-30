import { MongoClient, ObjectId } from 'mongodb';

let client = null;
let db = null;

export async function connectMongo(uri) {
  if (client) return db;
  
  client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  db = client.db('redbook_assistant');
  
  // 创建索引
  await db.collection('users').createIndex({ username: 1 }, { unique: true });
  await db.collection('users').createIndex({ phone: 1 }, { sparse: true });
  await db.collection('topics').createIndex({ user_id: 1 });
  await db.collection('favorites').createIndex({ user_id: 1, topic_id: 1 }, { unique: true });
  await db.collection('plans').createIndex({ user_id: 1, topic_id: 1 }, { unique: true });
  
  console.log('MongoDB connected');
  return db;
}

function toObject(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, id: _id.toString() };
}

function toObjectId(id) {
  try { return new ObjectId(id); } catch { return null; }
}

const mongoDb = {
  async findUserByUsername(username) {
    const doc = await db.collection('users').findOne({ username });
    return toObject(doc);
  },
  
  async findUserById(id) {
    const oid = toObjectId(id);
    if (!oid) return null;
    const doc = await db.collection('users').findOne({ _id: oid });
    return toObject(doc);
  },
  
  async findUserByPhone(phone) {
    if (!phone) return null;
    const doc = await db.collection('users').findOne({ phone });
    return toObject(doc);
  },
  
  async createUser(user) {
    const { id, ...rest } = user;
    const result = await db.collection('users').insertOne(rest);
    return { ...rest, id: result.insertedId.toString() };
  },
  
  async updateUser(id, updates) {
    const oid = toObjectId(id);
    if (!oid) return null;
    await db.collection('users').updateOne({ _id: oid }, { $set: updates });
    return this.findUserById(id);
  },
  
  async getTopicsByUser(userId) {
    const docs = await db.collection('topics').find({ user_id: userId }).toArray();
    return docs.map(toObject);
  },
  
  async findTopicById(id) {
    const oid = toObjectId(id);
    if (!oid) return null;
    const doc = await db.collection('topics').findOne({ _id: oid });
    return toObject(doc);
  },
  
  async createTopic(topic) {
    const { id, ...rest } = topic;
    const result = await db.collection('topics').insertOne(rest);
    return { ...rest, id: result.insertedId.toString() };
  },
  
  async updateTopic(id, updates) {
    const oid = toObjectId(id);
    if (!oid) return null;
    await db.collection('topics').updateOne({ _id: oid }, { $set: updates });
    return this.findTopicById(id);
  },
  
  async deleteTopic(id) {
    const oid = toObjectId(id);
    if (!oid) return;
    await db.collection('topics').deleteOne({ _id: oid });
    await db.collection('favorites').deleteMany({ topic_id: id });
    await db.collection('plans').deleteMany({ topic_id: id });
  },
  
  async getFavoritesByUser(userId) {
    const docs = await db.collection('favorites').find({ user_id: userId }).toArray();
    return docs.map(toObject);
  },
  
  async toggleFavorite(userId, topicId) {
    const existing = await db.collection('favorites').findOne({ user_id: userId, topic_id: topicId });
    if (existing) {
      await db.collection('favorites').deleteOne({ _id: existing._id });
      return false;
    }
    await db.collection('favorites').insertOne({
      user_id: userId,
      topic_id: topicId,
      created_at: new Date().toISOString()
    });
    return true;
  },
  
  async getPlansByUser(userId) {
    const docs = await db.collection('plans').find({ user_id: userId }).toArray();
    return docs.map(toObject);
  },
  
  async togglePlan(userId, topicId) {
    const existing = await db.collection('plans').findOne({ user_id: userId, topic_id: topicId });
    if (existing) {
      await db.collection('plans').deleteOne({ _id: existing._id });
      return false;
    }
    await db.collection('plans').insertOne({
      user_id: userId,
      topic_id: topicId,
      status: 'pending',
      created_at: new Date().toISOString()
    });
    return true;
  },
};

export default mongoDb;
