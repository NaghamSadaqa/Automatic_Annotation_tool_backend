
import  { Sequelize, DataTypes } from 'sequelize';
import  {sequelize} from '../connection.js';
import UserModel from "./user.js";
import SentenceModel from './sentence.js'

const NoteModel = sequelize.define("Note", {
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  sender_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  receiver_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  sentence_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  sentence_text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  label: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});
UserModel.hasMany(NoteModel, { as: 'sentNotes', foreignKey: 'sender_id' });
UserModel.hasMany(NoteModel, { as: 'receivedNotes', foreignKey: 'receiver_id' });

NoteModel.belongsTo(UserModel, { as: 'sender', foreignKey: 'sender_id' });
NoteModel.belongsTo(UserModel, { as: 'receiver', foreignKey: 'receiver_id' });

SentenceModel.hasMany(NoteModel, { foreignKey: 'sentence_id' });
NoteModel.belongsTo(SentenceModel, { foreignKey: 'sentence_id' });


export default NoteModel;