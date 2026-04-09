const BASE = import.meta.env.VITE_PFM_BASE_URL;

export const API_URLS = {
  AUTH: {
    AUTHENTICATE: `${BASE}authenticate`,
    REGISTER: `${BASE}authenticate/create`,
  },
  ALLOCATIONS: {
    BASE: `${BASE}get/allocation.mapping`,
    SEARCH: `${BASE}search/allocation.mapping`,
    GET_BY_ID: (id: number) => `${BASE}get/allocation.mapping/allocId/${id}`,
    CREATE: `${BASE}allocation.mapping/create/`,
    UPDATE: (id: number) => `${BASE}allocation.mapping/update/${id}`,
    DELETE: (id: number) => `${BASE}allocation.mapping/delete/${id}`,
  },
  CC_DETAILS: {
    BASE: `${BASE}get/cc.details`,
    SEARCH: `${BASE}search/cc.details`,
    CREATE: `${BASE}cc.details/create/`,
    UPDATE: (id: number) => `${BASE}cc.details/update/${id}`,
    DELETE: (id: number) => `${BASE}cc.details/delete/${id}`,
  },
  CC_EXPENSE: {
    BASE: (ccRecId: number) => `${BASE}search/cc.record.expense/ccRecId/${ccRecId}`,
    GET_BY_ID: (id: number) => `${BASE}get/cc.record.expense/ccExpId/${id}`,
    CREATE: `${BASE}cc.record.expense/create/`,
    UPDATE: (id: number) => `${BASE}cc.record.expense/update/${id}`,
    DELETE: (id: number) => `${BASE}cc.record.expense/delete/${id}`,
  },
  CC_RECORD_TRACKER: {
    BASE: `${BASE}get/cc.recordTracker`,
  },
  CONNECTED_APPS: {
    BASE: `${BASE}get/cc.connectedApp`,
    SEARCH_BY_CC: (ccId: number|string) => `${BASE}search/cc.connectedApp/ccId/${ccId}`,
    SEARCH_GLOBAL: `${BASE}search/cc.connectedApp`,
    CREATE: `${BASE}cc.connectedApp/create/`,
    UPDATE: (id: number|string) => `${BASE}cc.connectedApp/update/${id}`,
    DELETE: (id: number|string) => `${BASE}cc.connectedApp/delete/${id}`,
  },
  BILLING_CYCLE: {
    BASE: `${BASE}get/cc.recordTracker`,
    SEARCH_BY_CC: (ccId: number|string) => `${BASE}search/cc.record.tracker/ccId/${ccId}`,
    SEARCH_GLOBAL: `${BASE}search/cc.record.tracker`,
    CREATE: `${BASE}cc.recordTracker/create/`,
    UPDATE: (id: number|string) => `${BASE}cc.recordTracker/update/${id}`,
    DELETE: (id: number|string) => `${BASE}cc.recordTracker/delete/${id}`,
  },
  WANT_LIST: {
    BASE: `${BASE}get/wantlist`,
    SEARCH: `${BASE}search/wantlist`,
    GET_BY_ID: (id: number) => `${BASE}get/wantlist/id/${id}`,
    CREATE: `${BASE}wantlist/create/`,
    UPDATE: (id: number|string) => `${BASE}wantlist/update/${id}`,
    DELETE: (id: number|string) => `${BASE}wantlist/delete/${id}`,
  },
  SALARY_TRACKER: {
    BASE: `${BASE}get/salarytracker`,
    SEARCH: `${BASE}search/salarytracker`,
    GET_BY_ID: (id: number) => `${BASE}get/salarytracker/id/${id}`,
    CREATE: `${BASE}salarytracker/create/`,
    UPDATE: (id: number) => `${BASE}salarytracker/update/${id}`,
    DELETE: (id: number) => `${BASE}salarytracker/delete/${id}`,
  },
  SALARY_EXPENSE: {
    BASE_GLOBAL: `${BASE}get/salaryexpensetracker`,
    SEARCH: `${BASE}search/salaryexpensetracker`,
    BASE_BY_SALARY: (salaryId: number) => `${BASE}search/salaryexpensetracker/salaryId/${salaryId}`,
    GET_BY_ID: (id: number) => `${BASE}get/salaryexpensetracker/id/${id}`,
    CREATE: `${BASE}salaryexpensetracker/create/`,
    UPDATE: (id: number|string) => `${BASE}salaryexpensetracker/update/${id}`,
    DELETE: (id: number|string) => `${BASE}salaryexpensetracker/delete/${id}`,
  },
  INVESTMENT: {
    BASE: `${BASE}get/investmentsandsavingsday`,
    SEARCH_BY_ALLOC: (allocId: number|string) => `${BASE}search/investmentsandsavingsday/allocId/${allocId}`,
    CREATE: `${BASE}investmentsandsavingsday/create/`,
    UPDATE: (id: number|string) => `${BASE}investmentsandsavingsday/update/${id}`,
    DELETE: (id: number|string) => `${BASE}investmentsandsavingsday/delete/${id}`,
  },
  MONTHLY_GROWTH: {
    BASE: `${BASE}get/monthlygrowth`,
    GET_BY_ID: (id: number) => `${BASE}get/monthlygrowth/id/${id}`,
    SEARCH_BY_ALLOC: (allocId: number) => `${BASE}search/monthlygrowth/allocId/${allocId}`,
  },
  YEARLY_GROWTH: {
    BASE: `${BASE}get/yearlygrowth`,
    GET_BY_ID: (id: number) => `${BASE}get/yearlygrowth/id/${id}`,
    SEARCH_BY_ALLOC: (allocId: number) => `${BASE}search/yearlygrowth/allocId/${allocId}`,
  },
  NET_WORTH: {
    GET_BY_MONTH_YEAR: `${BASE}get/networth.monthYear`,
    CREATE: `${BASE}networth/create/`,
    UPDATE: (id: number) => `${BASE}networth/update/${id}`,
  }
};
