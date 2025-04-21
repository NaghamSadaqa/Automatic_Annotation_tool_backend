import { Sequelize, DataTypes } from 'sequelize';
import { sequelize } from '../connection.js';
import UserModel from './user.js';
import AnnotationTaskModel from './annotationtask.js';

const InvitationModel = sequelize.define("Invitation", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  task_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  sender_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  receiver_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'Invitations',
  timestamps: true
});



// علاقة مع التاسك
InvitationModel.belongsTo(AnnotationTaskModel, {
  foreignKey: 'task_id',
  as: 'Task',
  onDelete: 'CASCADE'
});
AnnotationTaskModel.hasMany(InvitationModel, {
  foreignKey: 'task_id',
  as: 'TaskInvitations' ,
  onDelete: 'CASCADE'
});

// علاقة مع المرسل
InvitationModel.belongsTo(UserModel, {
  foreignKey: 'sender_id',
  as: 'Sender',
  onDelete: 'CASCADE'
});
UserModel.hasMany(InvitationModel, {
  foreignKey: 'sender_id',
  as: 'SentInvitations',
  onDelete: 'CASCADE'
});

// علاقة مع المستقبل
InvitationModel.belongsTo(UserModel, {
  foreignKey: 'receiver_id',
  as: 'Receiver',
  onDelete: 'CASCADE',
});
UserModel.hasMany(InvitationModel, {
  foreignKey: 'receiver_id',
  as: 'ReceivedInvitations',
  onDelete: 'CASCADE',
});

export default InvitationModel;