
import {authenticateToken} from '../middleware/auth.js';
import {Router} from 'express';
import { calculateAgreementWithAI, StartResolvingDisagreements, getNextAnnotationSentence, submitAnnotation,  exportFinalLabels1, getSampleAnnotations } from './assignSampleToAnnotators.js';
const router = Router();

router.get('/:task_id/next', authenticateToken, getNextAnnotationSentence);
router.post('/:task_id/start-resolving', authenticateToken, StartResolvingDisagreements);





// هاي الي بدنا نحسب من خلالها التوافق بين 2 انوتيتر رح نجيب الجمل ال10 بالمية
//  الي صنفوهم ونبعتهم للفلاسك الذكاء عشان يحسب الانتر انوتيتر اجريمنت ويرجعلنا اذا بينهم توافق او لا 
// طبعا بصنفو بدخلو تصنيف الجملة وال id
// درجة تاكدهم من التصنيف بس يوصلو لاخر جملة رح يرجع فلاسك ريسبونس انه كم نسبة التوافق بينهم
router.post('/:task_id/annotation', authenticateToken, submitAnnotation);


router.get('/:task_id/Ai-human-agreement',authenticateToken ,calculateAgreementWithAI);

router.get('/:task_id/export-final-labels',authenticateToken ,exportFinalLabels1);

router.get('/:task_id/sample-annotations', authenticateToken, getSampleAnnotations);

export default router;
