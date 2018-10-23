import { library, dom } from '@fortawesome/fontawesome-svg-core';

// Regular
import { faSmile } from '@fortawesome/free-regular-svg-icons/faSmile';

// Solid
import { faAdjust } from '@fortawesome/free-solid-svg-icons/faAdjust';
import { faArrowAltCircleRight } from '@fortawesome/free-solid-svg-icons/faArrowAltCircleRight';
import { faBan } from '@fortawesome/free-solid-svg-icons/faBan';
import { faBars } from '@fortawesome/free-solid-svg-icons/faBars';
import { faCaretDown } from '@fortawesome/free-solid-svg-icons/faCaretDown';
import { faCaretUp } from '@fortawesome/free-solid-svg-icons/faCaretUp';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight';
import { faCog } from '@fortawesome/free-solid-svg-icons/faCog';
import { faCogs } from '@fortawesome/free-solid-svg-icons/faCogs';
import { faComment } from '@fortawesome/free-solid-svg-icons/faComment';
import { faEllipsisH } from '@fortawesome/free-solid-svg-icons/faEllipsisH';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons/faExclamationTriangle';
import { faFrown } from '@fortawesome/free-solid-svg-icons/faFrown';
import { faInfo } from '@fortawesome/free-solid-svg-icons/faInfo';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons/faInfoCircle';
import { faLock } from '@fortawesome/free-solid-svg-icons/faLock';
import { faMinusSquare } from '@fortawesome/free-solid-svg-icons/faMinusSquare';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons/faPaperPlane';
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus';
import { faPlusSquare } from '@fortawesome/free-solid-svg-icons/faPlusSquare';
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons/faQuestionCircle';
import { faSearch } from '@fortawesome/free-solid-svg-icons/faSearch';
import { faServer } from '@fortawesome/free-solid-svg-icons/faServer';
import { faSignOutAlt } from '@fortawesome/free-solid-svg-icons/faSignOutAlt';
import { faSpinner } from '@fortawesome/free-solid-svg-icons/faSpinner';
import { faStepBackward } from '@fortawesome/free-solid-svg-icons/faStepBackward';
import { faStepForward } from '@fortawesome/free-solid-svg-icons/faStepForward';
import { faSync } from '@fortawesome/free-solid-svg-icons/faSync';
import { faThumbtack } from '@fortawesome/free-solid-svg-icons/faThumbtack';
import { faTimes } from '@fortawesome/free-solid-svg-icons/faTimes';
import { faTrash } from '@fortawesome/free-solid-svg-icons/faTrash';
import { faUndo } from '@fortawesome/free-solid-svg-icons/faUndo';
import { faUnlock } from '@fortawesome/free-solid-svg-icons/faUnlock';
import { faUser } from '@fortawesome/free-solid-svg-icons/faUser';
import { faUsers } from '@fortawesome/free-solid-svg-icons/faUsers';
import { faVolumeOff } from '@fortawesome/free-solid-svg-icons/faVolumeOff';
import { faWindowClose } from '@fortawesome/free-solid-svg-icons/faWindowClose';

export function FontAwesome() {
    library.add(
        // Regular
        faSmile,

        // Solid
        faAdjust,
        faArrowAltCircleRight,
        faBan,
        faBars,
        faCaretDown,
        faCaretUp,
        faChevronRight,
        faCog,
        faCogs,
        faComment,
        faEllipsisH,
        faExclamationTriangle,
        faFrown,
        faInfo,
        faInfoCircle,
        faLock,
        faMinusSquare,
        faPaperPlane,
        faPlus,
        faPlusSquare,
        faQuestionCircle,
        faSearch,
        faServer,
        faSignOutAlt,
        faSpinner,
        faStepBackward,
        faStepForward,
        faSync,
        faThumbtack,
        faTimes,
        faTrash,
        faUndo,
        faUnlock,
        faUser,
        faUsers,
        faVolumeOff,
        faWindowClose,
    );
    dom.watch();
    window.FontAwesomeConfig.searchPseudoElements = true;
}
