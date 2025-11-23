import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { 
  FiUsers, 
  FiUserPlus, 
  FiEdit, 
  FiTrash2, 
  FiSearch,
  FiFilter,
  FiDownload,
  FiUpload,
  FiSettings,
  FiActivity,
  FiShield,
  FiDatabase,
  FiServer,
  FiMail,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle
} from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuthStore } from '../../stores/authStore';
import { 
  Card, 
  Button, 
  Input, 
  Select, 
  Badge, 
  Flex, 
  Grid, 
  Spacer,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  LoadingSpinner
} from '../../styles/GlobalStyle';
import UserManagement from '../../components/UserManagement/UserManagement';
import ComplianceDashboard from '../../components/ComplianceDashboard/ComplianceDashboard';
import toast from 'react-hot-toast';
import axios from 'axios';

const AdminContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.lg};
`;

const AdminHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${props => props.theme.spacing.lg};
`;

const AdminTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  margin: 0;
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
`;

const AdminActions = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.sm};
`;

const StatsGrid = styled(Grid)`
  margin-bottom: ${props => props.theme.spacing.xl};
`;

const StatCard = styled(Card)`
  text-align: center;
  padding: ${props => props.theme.spacing.lg};
  background: ${props => props.variant === 'primary' ? props.theme.colors.primary : props.theme.colors.surface};
  color: ${props => props.variant === 'primary' ? 'white' : props.theme.colors.text};
`;

const StatValue = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: ${props => props.theme.spacing.sm};
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatIcon = styled.div`
  font-size: 2rem;
  margin-bottom: ${props => props.theme.spacing.sm};
  opacity: 0.8;
`;

const TabsContainer = styled.div`
  display: flex;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  margin-bottom: ${props => props.theme.spacing.lg};
`;

const Tab = styled.button`
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
  border: none;
  background: none;
  color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.textSecondary};
  font-weight: ${props => props.active ? '600' : '500'};
  cursor: pointer;
  border-bottom: 2px solid ${props => props.active ? props.theme.colors.primary : 'transparent'};
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};

  &:hover {
    color: ${props => props.theme.colors.primary};
  }
`;

const TabContent = styled.div`
  display: ${props => props.active ? 'block' : 'none'};
`;

const TableContainer = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.borderRadius.lg};
  overflow: hidden;
  box-shadow: ${props => props.theme.shadows.sm};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.thead`
  background: ${props => props.theme.colors.background};
`;

const TableHeaderCell = styled.th`
  padding: ${props => props.theme.spacing.md};
  text-align: left;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr`
  border-bottom: 1px solid ${props => props.theme.colors.border};
  transition: background-color 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.background};
  }
`;

const TableCell = styled.td`
  padding: ${props => props.theme.spacing.md};
  color: ${props => props.theme.colors.text};
`;

const UserAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => props.theme.colors.accent};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

const UserName = styled.div`
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

const UserEmail = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.textSecondary};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.xs};
`;

const ActionButton = styled(Button)`
  padding: ${props => props.theme.spacing.xs};
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SearchContainer = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.sm};
  margin-bottom: ${props => props.theme.spacing.lg};
  align-items: center;
`;

const FilterContainer = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.sm};
  align-items: center;
`;

const Admin = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();

  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery(
    ['users', searchTerm, filterRole],
    async () => {
      const response = await axios.get('/api/admin/users', {
        params: { search: searchTerm, role: filterRole }
      });
      return response.data;
    }
  );

  // Fetch groups
  const { data: groups, isLoading: groupsLoading } = useQuery(
    'groups',
    async () => {
      const response = await axios.get('/api/admin/groups');
      return response.data;
    }
  );

  // Fetch recordings
  const { data: recordings, isLoading: recordingsLoading } = useQuery(
    'recordings',
    async () => {
      const response = await axios.get('/api/admin/recordings');
      return response.data;
    }
  );

  // Fetch system stats
  const { data: stats, isLoading: statsLoading } = useQuery(
    'admin-stats',
    async () => {
      const response = await axios.get('/api/admin/stats');
      return response.data;
    }
  );

  // Create user mutation
  const createUserMutation = useMutation(
    async (userData) => {
      const response = await axios.post('/api/admin/users', userData);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        toast.success('User created successfully');
        setShowUserModal(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create user');
      }
    }
  );

  // Update user mutation
  const updateUserMutation = useMutation(
    async ({ userId, userData }) => {
      const response = await axios.put(`/api/admin/users/${userId}`, userData);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        toast.success('User updated successfully');
        setShowUserModal(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update user');
      }
    }
  );

  // Delete user mutation
  const deleteUserMutation = useMutation(
    async (userId) => {
      const response = await axios.delete(`/api/admin/users/${userId}`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        toast.success('User deleted successfully');
        setShowDeleteModal(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete user');
      }
    }
  );

  const handleCreateUser = () => {
    setSelectedUser(null);
    setShowUserModal(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.id);
    }
  };

  const handleUserSubmit = (userData) => {
    if (selectedUser) {
      updateUserMutation.mutate({ userId: selectedUser.id, userData });
    } else {
      createUserMutation.mutate(userData);
    }
  };

  const tabs = [
    { id: 'users', label: 'Users', icon: FiUsers },
    { id: 'groups', label: 'Groups', icon: FiUsers },
    { id: 'recordings', label: 'Recordings', icon: FiActivity },
    { id: 'compliance', label: 'Compliance', icon: FiShield },
    { id: 'system', label: 'System', icon: FiServer },
  ];

  if (statsLoading) {
    return (
      <AdminContainer>
        <Flex justify="center" align="center" style={{ height: '400px' }}>
          <LoadingSpinner size="48px" />
        </Flex>
      </AdminContainer>
    );
  }

  return (
    <AdminContainer>
      <AdminHeader>
        <AdminTitle>
          <FiShield />
          Admin Portal
        </AdminTitle>
        <AdminActions>
          <Button variant="secondary" onClick={() => window.print()}>
            <FiDownload />
            Export
          </Button>
          <Button variant="primary" onClick={handleCreateUser}>
            <FiUserPlus />
            Add User
          </Button>
        </AdminActions>
      </AdminHeader>

      {/* Stats Grid */}
      <StatsGrid columns={4}>
        <StatCard variant="primary">
          <StatIcon>
            <FiUsers />
          </StatIcon>
          <StatValue>{stats?.totalUsers || 0}</StatValue>
          <StatLabel>Total Users</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatIcon>
            <FiUsers />
          </StatIcon>
          <StatValue>{stats?.activeUsers || 0}</StatValue>
          <StatLabel>Active Users</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatIcon>
            <FiActivity />
          </StatIcon>
          <StatValue>{stats?.totalRecordings || 0}</StatValue>
          <StatLabel>Recordings</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatIcon>
            <FiServer />
          </StatIcon>
          <StatValue>{stats?.activeServers || 0}</StatValue>
          <StatLabel>Active Servers</StatLabel>
        </StatCard>
      </StatsGrid>

      {/* Tabs */}
      <TabsContainer>
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon />
            {tab.label}
          </Tab>
        ))}
      </TabsContainer>

      {/* Tab Content */}
      <TabContent active={activeTab === 'users'}>
        <UserManagement />
      </TabContent>

      <TabContent active={activeTab === 'compliance'}>
        <ComplianceDashboard />
      </TabContent>

      {/* User Modal */}
      {showUserModal && (
        <UserModal
          user={selectedUser}
          onSubmit={handleUserSubmit}
          onClose={() => setShowUserModal(false)}
          isLoading={createUserMutation.isLoading || updateUserMutation.isLoading}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteModal
          user={selectedUser}
          onConfirm={handleConfirmDelete}
          onClose={() => setShowDeleteModal(false)}
          isLoading={deleteUserMutation.isLoading}
        />
      )}
    </AdminContainer>
  );
};

// User Modal Component
const UserModal = ({ user, onSubmit, onClose, isLoading }) => {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    name: user?.name || '',
    role: user?.role || 'trader',
    isActive: user?.isActive ?? true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <Modal>
      <ModalContent>
        <ModalHeader>
          <h3>{user ? 'Edit User' : 'Create User'}</h3>
          <Button variant="secondary" onClick={onClose}>
            <FiXCircle />
          </Button>
        </ModalHeader>
        <ModalBody>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label>Username</label>
                <Input
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label>Email</label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label>Full Name</label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label>Role</label>
                <Select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="trader">Trader</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="compliance">Compliance</option>
                  <option value="admin">Admin</option>
                </Select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                />
                <label>Active</label>
              </div>
            </div>
          </form>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? <LoadingSpinner size="16px" /> : null}
            {user ? 'Update User' : 'Create User'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

// Delete Modal Component
const DeleteModal = ({ user, onConfirm, onClose, isLoading }) => {
  return (
    <Modal>
      <ModalContent>
        <ModalHeader>
          <h3>Delete User</h3>
          <Button variant="secondary" onClick={onClose}>
            <FiXCircle />
          </Button>
        </ModalHeader>
        <ModalBody>
          <p>Are you sure you want to delete user <strong>{user?.name}</strong>?</p>
          <p style={{ color: '#ff4444', fontSize: '0.875rem' }}>
            This action cannot be undone.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? <LoadingSpinner size="16px" /> : null}
            Delete User
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default Admin;
