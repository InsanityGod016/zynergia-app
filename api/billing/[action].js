import cancel from '../_lib/billing-endpoints/cancel.js';
import checkout from '../_lib/billing-endpoints/checkout.js';
import claim from '../_lib/billing-endpoints/claim.js';
import portal from '../_lib/billing-endpoints/portal.js';
import signupStatus from '../_lib/billing-endpoints/signup-status.js';
import status from '../_lib/billing-endpoints/status.js';
import { handleApi, HttpError } from '../_lib/http.js';

const endpoints = new Map([
  ['cancel', cancel],
  ['checkout', checkout],
  ['claim', claim],
  ['portal', portal],
  ['signup-status', signupStatus],
  ['status', status],
]);

export default async function handler(req, res) {
  const action = Array.isArray(req.query?.action) ? req.query.action[0] : req.query?.action;
  const endpoint = endpoints.get(action);
  if (endpoint) return endpoint(req, res);

  return handleApi(req, res, { methods: ['GET', 'POST'], label: 'billing-route' }, async () => {
    throw new HttpError(404, 'ENDPOINT_NOT_FOUND', 'Endpoint no encontrado.');
  });
}
