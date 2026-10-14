// The nu.waves catalogue as the app's feed: https://waves.khensu.nu/waves/catalogue.json
import type { APIRoute } from 'astro';
import { CATALOGUE } from '../../data/waves';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(CATALOGUE), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
