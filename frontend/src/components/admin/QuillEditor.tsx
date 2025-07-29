import React, { forwardRef, useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Custom ReactQuill wrapper to fix findDOMNode deprecation warning
const QuillEditor = forwardRef<ReactQuill, React.ComponentProps<typeof ReactQuill>>((props, ref) => {
  const quillRef = useRef<ReactQuill>(null);
  
  // Forward the ref
  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') {
        ref(quillRef.current);
      } else {
        ref.current = quillRef.current;
      }
    }
  }, [ref]);

  return <ReactQuill ref={quillRef} {...props} />;
});

QuillEditor.displayName = 'QuillEditor';

export default QuillEditor; 