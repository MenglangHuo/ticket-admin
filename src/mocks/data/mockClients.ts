export interface ApiClientItem {
  name: string;
  client_id: string;
  secret: string;
  rate_limit: string;
  allowed_types: string[];
  status: 'active' | 'inactive' | 'rate_limited';
  last_ping: string;
}

export const MOCK_API_CLIENTS: ApiClientItem[] = [
  {
    name: 'Bronx Mobile Storefront (iOS & Android)',
    client_id: 'bronx_mobile_app_prod',
    secret: '4d2aff85••••••••',
    rate_limit: '500 req/min',
    allowed_types: ['bug', 'enhancement', 'question'],
    status: 'active',
    last_ping: 'Just now',
  },
  {
    name: 'Branch POS Terminal Sync Service',
    client_id: 'pos_sync_service_v2',
    secret: '9e7b2311••••••••',
    rate_limit: '1,200 req/min',
    allowed_types: ['bug', 'task'],
    status: 'active',
    last_ping: '35s ago',
  },
  {
    name: 'Customer Helpdesk Ingestion Webhook',
    client_id: 'helpdesk_webhook_int',
    secret: '1a8c9034••••••••',
    rate_limit: '300 req/min',
    allowed_types: ['bug', 'question'],
    status: 'active',
    last_ping: '2m ago',
  },
  {
    name: 'E-Commerce Payment Gateway Monitor',
    client_id: 'payment_alert_service',
    secret: '7f44a190••••••••',
    rate_limit: '600 req/min',
    allowed_types: ['bug', 'task'],
    status: 'active',
    last_ping: '5m ago',
  },
  {
    name: 'Legacy Inventory ERP Sync (Archived)',
    client_id: 'erp_legacy_batch_sync',
    secret: '3d10ee92••••••••',
    rate_limit: '50 req/min',
    allowed_types: ['task'],
    status: 'inactive',
    last_ping: '3 days ago',
  },
];
