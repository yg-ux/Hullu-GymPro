// Aggregator — imports modular section files and merges into final dictionaries.
// To add new strings: create or edit a section file in ./keys/, then import below.
import { core }      from './keys/core';
import { customers } from './keys/customers';
import { staff }     from './keys/staff';
import { auth }      from './keys/auth';
import { dashboard } from './keys/dashboard';
import { pages }     from './keys/pages';

const sections = [core, customers, staff, auth, dashboard, pages];

export const translations = {
  en: Object.assign({}, ...sections.map(s => s.en)),
  am: Object.assign({}, ...sections.map(s => s.am)),
};
