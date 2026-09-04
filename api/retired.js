export default function handler(_req, res) {
  res.status(410).json({
    error: 'Este flujo fue retirado. Usa el proceso seguro de cuenta y facturación.',
    code: 'ENDPOINT_RETIRED',
  });
}
