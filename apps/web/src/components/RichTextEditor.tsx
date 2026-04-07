import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Code2,
  Minus,
  Link as LinkIcon,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  disabled?: boolean;
}

const ToolbarButton = ({
  active,
  onClick,
  disabled,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    disabled={disabled}
    className={[
      'p-1.5 rounded transition-colors',
      active ? 'bg-coc-accent-red/20 text-coc-accent-red' : 'text-coc-text-secondary hover:text-coc-parchment hover:bg-coc-bg-tertiary',
      disabled ? 'opacity-30 cursor-not-allowed' : '',
    ].join(' ')}
  >
    {children}
  </button>
);

export function RichTextEditor({
  value,
  onChange,
  placeholder = '请输入内容...',
  minHeight = '200px',
  disabled,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
        heading: { levels: [2, 3] },
        codeBlock: { HTMLAttributes: { class: 'bg-coc-bg-secondary border border-coc-border rounded p-3 font-mono text-sm' } },
        horizontalRule: { HTMLAttributes: { class: 'border-coc-border my-4' } },
        bulletList: {
          HTMLAttributes: { class: 'list-disc pl-5 space-y-1' },
        },
        orderedList: {
          HTMLAttributes: { class: 'list-decimal pl-5 space-y-1' },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'border-l-4 border-coc-accent-gold bg-coc-bg-secondary/30 py-1 px-4 rounded-r text-coc-parchment italic',
          },
        },
      }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-coc-accent-gold hover:text-coc-gold.glow underline',
          target: '_blank',
          rel: 'noopener noreferrer nofollow',
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: [
          'w-full px-4 py-3 text-sm text-coc-parchment leading-relaxed',
          'bg-coc-bg-primary border border-coc-border rounded-b-lg',
          'focus:outline-none focus:border-coc-gold',
          'prose prose-invert max-w-none',
          'prose-headings:text-coc-parchment prose-headings:font-ritual prose-headings:mt-3 prose-headings:mb-1',
          'prose-a:text-coc-accent-gold hover:prose-a:text-coc-gold.glow',
          'prose-strong:text-coc-parchment',
          'prose-code:text-coc-parchment prose-code:bg-coc-bg-secondary prose-code:px-1 prose-code:py-0.5 prose-code:rounded',
          'prose-pre:bg-coc-bg-secondary prose-pre:border prose-pre:border-coc-border prose-pre:rounded-lg',
          'prose-blockquote:border-l-4 prose-blockquote:border-coc-accent-gold prose-blockquote:bg-coc-bg-secondary/30 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r',
          'prose-ul:list-disc prose-ol:list-decimal',
          'prose-hr:border-coc-border',
        ].join(' '),
        style: `min-height: ${minHeight}`,
      },
    },
  });

  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    const normalized = url.match(/^https?:\/\//) ? url : `https://${url}`;
    editor.chain().focus().extendMarkRange('link').setLink({ href: normalized }).run();
  };

  return (
    <div className={`border border-coc-border rounded-lg overflow-hidden ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-coc-bg-secondary border-b border-coc-border">
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="粗体"
        >
          <Bold size={14} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="斜体"
        >
          <Italic size={14} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="删除线"
        >
          <Strikethrough size={14} />
        </ToolbarButton>
        <div className="w-px h-4 bg-coc-border mx-1" />
        <ToolbarButton
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="二级标题"
        >
          <Heading2 size={14} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="三级标题"
        >
          <Heading3 size={14} />
        </ToolbarButton>
        <div className="w-px h-4 bg-coc-border mx-1" />
        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="无序列表"
        >
          <List size={14} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="有序列表"
        >
          <ListOrdered size={14} />
        </ToolbarButton>
        <div className="w-px h-4 bg-coc-border mx-1" />
        <ToolbarButton
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="引用"
        >
          <Quote size={14} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="行内代码"
        >
          <Code size={14} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="代码块"
        >
          <Code2 size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="分割线"
        >
          <Minus size={14} />
        </ToolbarButton>
        <div className="w-px h-4 bg-coc-border mx-1" />
        <ToolbarButton
          active={editor.isActive('link')}
          onClick={setLink}
          title="插入链接"
        >
          <LinkIcon size={14} />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />

      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #6b6558;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror:focus {
          outline: none;
        }
        .ProseMirror ul, .ProseMirror ol {
          padding-left: 1.25rem;
        }
        .ProseMirror ul li {
          list-style-type: disc;
        }
        .ProseMirror ol li {
          list-style-type: decimal;
        }
      `}</style>
    </div>
  );
}
