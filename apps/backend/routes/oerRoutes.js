// apps/backend/routes/oerRoutes.js
import { Router } from 'express';
import {
  listCatalog,
  wrapCatalogItem,
  getOerMeta,
  wrapBook,            // ⬅️ NEW
 
} from '../controllers/oerController.js';
import {
  listCollections,
  getCollectionItems,
  listCourses,
  getCourse,
   getBook,
} from '../controllers/oerCollectionsController.js';

import authUser from '../middleware/authUser.js';
import authOptional from '../middleware/authOptional.js'; // ⬅️ NEW (optional auth)

const r = Router();

/* -------------------- Catalog (flat items) -------------------- */
r.get('/oer/catalog', listCatalog); // ?type=video|text&subject=&provider=&limit=&offset=

/* ---- Collections (playlists/library groupings — unchanged) --- */
r.get('/oer/collections', listCollections);
r.get('/oer/collections/:idOrTitle/items', getCollectionItems);

/* ---- Courses (collections/books rendered as a course) -------- */
r.get('/oer/courses', listCourses);
r.get('/oer/courses/:idOrTitle', getCourse);
r.get('/oer/books/:idOrSlug', getBook);

/* ------------------------- Utilities -------------------------- */
r.post('/oer/wrap', authUser, wrapCatalogItem);          // body { slug }  (existing)
r.post('/oer/wrap-book', authOptional, wrapBook);        // body { idOrSlug } ⬅️ NEW
r.get('/oer/meta/:courseId', authUser, getOerMeta);      // license/flags for UI

export default r;
