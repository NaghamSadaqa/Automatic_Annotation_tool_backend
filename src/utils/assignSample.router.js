
import {authenticateToken} from '../middleware/auth.js';
import {Router} from 'express';
import { calculateAgreementWithAI, calculateKappaAgreement, distributeSampleToAnnotators, getAgreementData, getNextAnnotationSentence, submitAnnotation } from './assignSampleToAnnotators.js';
const router = Router();

router.get('/:task_id/next', authenticateToken, getNextAnnotationSentence);
router.post('/:task_id/annotation', authenticateToken, submitAnnotation);



// هاي الي بدنا نحسب من خلالها التوافق بين 2 انوتيتر رح نجيب الجمل ال10 بالمية
//  الي صنفوهم ونبعتهم للفلاسك الذكاء عشان يحسب الانتر انوتيتر اجريمنت ويرجعلنا اذا بينهم توافق او لا 
router.get('/:task_id/agreement', authenticateToken, calculateKappaAgreement); 


router.get('/:task_id/Ai-human-agreement', calculateAgreementWithAI);
export default router;