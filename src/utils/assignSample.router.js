
import {authenticateToken} from '../middleware/auth.js';
import {Router} from 'express';
import { distributeSampleToAnnotators, getNextAnnotationSentence, submitAnnotation } from './assignSampleToAnnotators.js';
const router = Router();
router.post('/:task_id/distribute',authenticateToken ,distributeSampleToAnnotators);
router.get('/:task_id/next', authenticateToken, getNextAnnotationSentence);
router.post('/:task_id/annotation', authenticateToken, submitAnnotation);
export default router;