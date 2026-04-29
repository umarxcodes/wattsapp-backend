import {
  assertGroupMembership,
  getGroupDetails,
  getUserGroups,
} from "../../services/group.service.js";

// ====*** join_group Socket Event Handler ***=====

const registerJoinGroupHandler = (socket) => {
  socket.on("join_group", async ({ groupId }) => {
    try {
      await assertGroupMembership(groupId, socket.user.id);
      socket.join(groupId);
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });
};

// ====*** leave_group Socket Event Handler ***=====

const registerLeaveGroupHandler = (socket) => {
  socket.on("leave_group", async ({ groupId }) => {
    try {
      socket.leave(groupId);
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });
};

// ====*** group_snapshot Socket Event Handler ***=====

const registerGroupSnapshotHandler = (socket) => {
  socket.on("group_snapshot", async ({ groupId }) => {
    try {
      const group = await getGroupDetails(groupId, socket.user.id);
      socket.emit("group_snapshot", group);
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });
};

// ====*** groups_list Socket Event Handler ***=====

const registerGroupsListHandler = (socket) => {
  socket.on("groups_list", async () => {
    try {
      const groups = await getUserGroups(socket.user.id);
      socket.emit("groups_list", groups);
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });
};

// ====*** Group Handler Registration ***=====

export const registerGroupHandlers = (io, socket) => {
  void io;
  registerJoinGroupHandler(socket);
  registerLeaveGroupHandler(socket);
  registerGroupSnapshotHandler(socket);
  registerGroupsListHandler(socket);
};
