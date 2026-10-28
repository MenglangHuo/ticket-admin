/**
 * Unified Mock Data Service
 * Exposes methods matching the application API interfaces for TicketApi,
 * ReportApi, TelegramApi, and AuthApi.
 */
import {
  getMockTicketsList,
  getMockTicketById,
  createMockTicket,
  updateMockTicket,
  deleteMockTicket,
  getMockTicketComments,
  createMockTicketComment,
  deleteMockTicketComment,
  getMockTicketAudits,
  resetMockTickets,
} from './data/mockTickets'
import { getMockReports } from './data/mockReports'
import {
  getMockSubscribers,
  generateMockInviteLink,
  deleteMockSubscriber,
  removeMockSubscriber,
  updateMockSubscriberStatus,
  getMockTelegramCounts,
  resetMockSubscribers,
  getMockTelegramBotInfo,
  updateMockTelegramBotConfig,
  resetMockBotInfo,
  getMockUnusedInvites,
  resetMockUnusedInvites,
  refreshMockUnusedInvite,
} from './data/mockSettings'

import { MOCK_API_CLIENTS } from './data/mockClients'
import {
  mockGenerateToken,
  mockLogin,
  mockValidateTwoFactor,
  MOCK_ADMIN_USER,
  MOCK_BRANCH_USER,
} from './data/mockAuth'
import {
  isMockDataEnabled,
  getEnvMockDataStatus,
  hasMockOverride,
  setMockDataOverride,
  toggleMockDataMode,
} from './config'

export const mockService = {
  // Config
  isMockDataEnabled,
  getEnvMockDataStatus,
  hasMockOverride,
  setMockDataOverride,
  toggleMockDataMode,

  // Tickets
  getTickets: getMockTicketsList,
  getTicketById: getMockTicketById,
  createTicket: createMockTicket,
  updateTicket: updateMockTicket,
  deleteTicket: deleteMockTicket,
  getTicketComments: getMockTicketComments,
  createTicketComment: createMockTicketComment,
  deleteTicketComment: deleteMockTicketComment,
  getTicketAudits: getMockTicketAudits,
  resetTickets: resetMockTickets,

  // Reports
  getReports: getMockReports,

  // Telegram
  getSubscribers: getMockSubscribers,
  generateInviteLink: generateMockInviteLink,
  deleteSubscriber: deleteMockSubscriber,
  removeSubscriber: removeMockSubscriber,
  updateSubscriberStatus: updateMockSubscriberStatus,
  getTelegramCounts: getMockTelegramCounts,
  resetSubscribers: resetMockSubscribers,
  getTelegramBotInfo: getMockTelegramBotInfo,
  updateTelegramBotConfig: updateMockTelegramBotConfig,
  resetBotInfo: resetMockBotInfo,
  getUnusedInvites: getMockUnusedInvites,
  resetUnusedInvites: resetMockUnusedInvites,
  refreshInvite: refreshMockUnusedInvite,

  // API Clients
  getClients: () => [...MOCK_API_CLIENTS],

  // Auth
  generateToken: mockGenerateToken,
  login: mockLogin,
  validateTwoFactor: mockValidateTwoFactor,
  demoAdminUser: MOCK_ADMIN_USER,
  demoBranchUser: MOCK_BRANCH_USER,
}

export default mockService
