'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import { Extension } from '@tiptap/core'
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  List, 
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2
} from 'lucide-react'

// Extensão Customizada de Tamanho de Fonte (FontSize) em Pixels
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() { return { types: ['textStyle'] } },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) return {}
              return { style: `font-size: ${attributes.fontSize}` }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    // @ts-ignore
    return {
      setFontSize: (fontSize: string) => ({ chain }: any) => {
        return chain().setMark('textStyle', { fontSize }).run()
      },
      unsetFontSize: () => ({ chain }: any) => {
        return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run()
      },
    }
  },
})

interface CopyEditorProps {
  title: string
  onTitleChange: (title: string) => void
  initialContent?: string
  onUpdate: (content: string) => void
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null
  }

  const btnClass = "p-1.5 rounded-md text-[#A1A1AA] hover:bg-[#2A2A2A] hover:text-white transition-colors"
  const activeClass = "bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 hover:text-[#D4AF37]"

  return (
    <div className="sticky top-0 sm:top-[64px] z-20 w-full bg-[#171717]/95 backdrop-blur-md border-b border-[#2A2A2A] px-4 py-2 shadow-sm flex items-center justify-center">
      <div className="w-full max-w-[800px] flex items-center flex-wrap gap-2">
        
        {/* Dropdown de Tamanho de Fonte */}
        <div className="flex items-center gap-1 border-r border-[#2A2A2A] pr-3 mr-1">
          <select 
            onChange={(e) => {
              const val = e.target.value
              if (val === 'default') editor.commands.unsetFontSize()
              else editor.commands.setFontSize(val)
            }}
            className="bg-[#202020] text-[#E0E0E0] border border-[#2A2A2A] px-2 py-1 rounded-md text-sm outline-none hover:border-[#3A3A3A] transition-colors focus:border-[#D4AF37] h-[32px] cursor-pointer"
          >
            <option value="default">Padrão</option>
            <option value="12px">12px</option>
            <option value="14px">14px</option>
            <option value="16px">16px</option>
            <option value="18px">18px</option>
            <option value="20px">20px</option>
            <option value="24px">24px</option>
            <option value="32px">32px</option>
            <option value="48px">48px</option>
          </select>
        </div>

        {/* Color Picker Nativo estilizado */}
        <div className="flex items-center gap-1 border-r border-[#2A2A2A] pr-3 mr-1">
          <label className="relative flex items-center justify-center w-8 h-8 rounded-md bg-[#202020] border border-[#2A2A2A] cursor-pointer hover:border-[#3A3A3A] hover:bg-[#2A2A2A] transition-all overflow-hidden" title="Cor do Texto">
            <input 
              type="color" 
              onInput={(e) => editor.chain().focus().setColor(e.currentTarget.value).run()}
              value={editor.getAttributes('textStyle').color || '#E0E0E0'} 
              className="w-full h-full cursor-pointer opacity-0 absolute inset-0 z-10"
            />
            {/* Visual indicator block */}
            <div className="w-4 h-4 rounded-full border border-black/20 relative z-0" style={{ backgroundColor: editor.getAttributes('textStyle').color || '#E0E0E0' }}></div>
          </label>
          <button
             onClick={() => editor.chain().focus().setColor('#D4AF37').run()}
             className="w-5 h-5 rounded-full ml-1 bg-[#D4AF37] border border-[#D4AF37]/50 shadow-sm"
             title="Dourado NoCry"
          />
        </div>

        {/* Formatação Simples */}
        <div className="flex items-center gap-1 border-r border-[#2A2A2A] pr-3 mr-1">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`${btnClass} ${editor.isActive('bold') ? activeClass : ''}`}
            title="Negrito"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`${btnClass} ${editor.isActive('italic') ? activeClass : ''}`}
            title="Itálico"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`${btnClass} ${editor.isActive('strike') ? activeClass : ''}`}
            title="Riscado"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
        </div>

        {/* Cabeçalhos */}
        <div className="flex items-center gap-1 border-r border-[#2A2A2A] pr-3 mr-1">
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`${btnClass} ${editor.isActive('heading', { level: 1 }) ? activeClass : ''}`}
            title="Título Inicial (H1)"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`${btnClass} ${editor.isActive('heading', { level: 2 }) ? activeClass : ''}`}
            title="Subtítulo (H2)"
          >
            <Heading2 className="w-4 h-4" />
          </button>
        </div>

        {/* Alinhamento */}
        <div className="flex items-center gap-1 border-r border-[#2A2A2A] pr-3 mr-1">
          <button
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`${btnClass} ${editor.isActive({ textAlign: 'left' }) ? activeClass : ''}`}
            title="Esquerda"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`${btnClass} ${editor.isActive({ textAlign: 'center' }) ? activeClass : ''}`}
            title="Centro"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`${btnClass} ${editor.isActive({ textAlign: 'right' }) ? activeClass : ''}`}
            title="Direita"
          >
            <AlignRight className="w-4 h-4" />
          </button>
        </div>

        {/* Listas */}
        <div className="flex items-center gap-1 pl-1">
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`${btnClass} ${editor.isActive('bulletList') ? activeClass : ''}`}
            title="Lista de Marcadores"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`${btnClass} ${editor.isActive('orderedList') ? activeClass : ''}`}
            title="Lista Numerada"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  )
}

export function CopyEditor({ title, onTitleChange, initialContent, onUpdate }: CopyEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      FontSize,
      Placeholder.configure({
        placeholder: 'Comece a escrever sua copy genial... (Digite "/" para comandos rápidos)',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: initialContent || '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-p:text-inherit prose-p:text-[17px] prose-p:leading-normal prose-headings:text-inherit prose-h1:text-[32px] prose-h2:text-[24px] prose-a:text-[#D4AF37] focus:outline-none max-w-none w-full min-h-[500px] cursor-text',
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML())
    },
  })

  return (
    <div className="relative w-full flex flex-col flex-1 editor-container items-start">
      
      {/* 1. Barra Fixa Suprema */}
      <MenuBar editor={editor} />
      
      {/* 2. Container Central da Folha */}
      <div className="w-full max-w-[800px] mx-auto pt-10 pb-32 px-6 sm:px-12 flex flex-col flex-1">
        
        {/* Título Giga simulando Docs */}
        <input 
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full bg-transparent text-[36px] md:text-[42px] font-bold text-white placeholder:text-[#3A3A3A] focus:outline-none mb-8 leading-tight tracking-tight mt-6"
          placeholder="Documento sem título"
        />

        {/* Tiptap Canvas */}
        <div 
          className="w-full h-full text-[#E0E0E0] font-sans antialiased selection:bg-[#D4AF37]/30"
          style={{ caretColor: '#D4AF37' }}
        >
          <style jsx global>{`
            .is-editor-empty:before {
              content: attr(data-placeholder);
              float: left;
              color: #4A4A4A;
              pointer-events: none;
              height: 0;
              font-style: italic;
            }
            .ProseMirror p {
              margin-top: 0;
              margin-bottom: 0;
            }
            .ProseMirror h1, .ProseMirror h2, .ProseMirror h3 {
              margin-top: 1.5em;
              margin-bottom: 0.5em;
              font-weight: 700;
              letter-spacing: -0.02em;
            }
            .ProseMirror ul {
              list-style-type: disc;
              padding-left: 1.5rem;
              margin-bottom: 0.5em;
            }
            .ProseMirror ol {
              list-style-type: decimal;
              padding-left: 1.5rem;
              margin-bottom: 0.5em;
            }
            .ProseMirror li p {
              margin-top: 0.25em;
              margin-bottom: 0.25em;
            }
          `}</style>
          <EditorContent editor={editor} />
        </div>

      </div>
    </div>
  )
}
