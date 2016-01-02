import {
  ApplicationFragment
} from 'editor/fragment/types';

import { create as createHTMLFragment } from './html';

import { create as createPreviewFragment } from './components/preview';
import { create as createPasteFragment } from './clipboard/handle-paste';
import { create as createLayerComponentFragment } from './components/layers-pane';

export default ApplicationFragment.create({
  id: 'basicDOMEntities',
  factory: {
    create({ app }) {
      app.fragments.push(
        ...createPreviewFragment({ app }),
        ...createPasteFragment({ app }),
        ...createLayerComponentFragment({ app }),
        ...createHTMLFragment({ app })
      );
    }
  }
});
