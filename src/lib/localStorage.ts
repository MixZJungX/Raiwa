import { RedeemCode, RedemptionRequest, User } from "@/types";

// Admin user initialization
const initializeAdmin = () => {
  const users = localStorage.getItem('users');
  if (!users) {
    // Create a default admin user
    const defaultAdmin: User = {
      username: 'admin',
      password: 'admin123',
      isAdmin: true
    };
    localStorage.setItem('users', JSON.stringify([defaultAdmin]));
  }
};

// Initialize localStorage with empty arrays for codes and requests
export const initializeLocalStorage = () => {
  if (!localStorage.getItem('codes')) {
    localStorage.setItem('codes', JSON.stringify([]));
  }
  
  if (!localStorage.getItem('requests')) {
    localStorage.setItem('requests', JSON.stringify([]));
  }
  
  initializeAdmin();
};

// Redeem Code Functions
export const getAllCodes = (): RedeemCode[] => {
  const codes = localStorage.getItem('codes');
  return codes ? JSON.parse(codes) : [];
};

export const addCode = (code: string): RedeemCode => {
  const newCode: RedeemCode = {
    id: crypto.randomUUID(),
    code,
    isUsed: false,
    createdAt: new Date().toISOString()
  };
  
  const codes = getAllCodes();
  localStorage.setItem('codes', JSON.stringify([...codes, newCode]));
  
  return newCode;
};

export const validateCode = (code: string): RedeemCode | null => {
  const codes = getAllCodes();
  const foundCode = codes.find(c => c.code === code && !c.isUsed);
  return foundCode || null;
};

export const markCodeAsUsed = (codeId: string): void => {
  const codes = getAllCodes();
  const updatedCodes = codes.map(code => 
    code.id === codeId ? { ...code, isUsed: true } : code
  );
  
  localStorage.setItem('codes', JSON.stringify(updatedCodes));
};

// Redemption Request Functions
export const getAllRequests = (): RedemptionRequest[] => {
  const requests = localStorage.getItem('requests');
  return requests ? JSON.parse(requests) : [];
};

export const addRequest = (request: Omit<RedemptionRequest, 'id' | 'createdAt'>): RedemptionRequest => {
  const newRequest: RedemptionRequest = {
    ...request,
    id: crypto.randomUUID(),
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  const requests = getAllRequests();
  localStorage.setItem('requests', JSON.stringify([...requests, newRequest]));
  
  return newRequest;
};

export const updateRequestStatus = (requestId: string, status: 'pending' | 'processing' | 'completed'): void => {
  const requests = getAllRequests();
  const updatedRequests = requests.map(request => 
    request.id === requestId ? { ...request, status } : request
  );
  
  localStorage.setItem('requests', JSON.stringify(updatedRequests));
};

// User Functions
export const getAllUsers = (): User[] => {
  const users = localStorage.getItem('users');
  return users ? JSON.parse(users) : [];
};

export const authenticateUser = (username: string, password: string): User | null => {
  const users = getAllUsers();
  const user = users.find(u => u.username === username && u.password === password);
  return user || null;
};

export const changeAdminPassword = (username: string, currentPassword: string, newPassword: string): boolean => {
  // First authenticate with current password
  const user = authenticateUser(username, currentPassword);
  
  if (!user) {
    return false;
  }
  
  // Update the password
  const users = getAllUsers();
  const updatedUsers = users.map(u => 
    u.username === username ? { ...u, password: newPassword } : u
  );
  
  // Save updated users to localStorage
  localStorage.setItem('users', JSON.stringify(updatedUsers));
  
  return true;
};

// For development/testing
export const clearAllData = () => {
  localStorage.removeItem('codes');
  localStorage.removeItem('requests');
  initializeLocalStorage();
};