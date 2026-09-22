import { useNavigate } from 'react-router-dom';
import { PageLayout } from '../components/layout/PageLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatusPill } from '../components/ui/StatusPill';
import { Input, Textarea, Select } from '../components/ui/Input';
import { Toggle } from '../components/ui/Toggle';

export default function ComponentsPage() {
  const navigate = useNavigate();
  return (
    <PageLayout>
      <div className="mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-primary transition-colors mb-3 cursor-pointer">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          Retour
        </button>
        <h1 className="text-headline-lg font-bold text-on-surface">Planche de composants</h1>
        <p className="text-body-base text-on-surface-variant mt-1">Bibliothèque de composants UI du design system</p>
      </div>

      <div className="space-y-10">
        <section>
          <h2 className="text-headline-md font-bold text-on-surface mb-4">Typographie</h2>
          <Card className="space-y-4">
            <div><p className="text-headline-lg text-on-surface">Headline LG (32px Bold)</p></div>
            <div><p className="text-headline-md text-on-surface">Headline MD (24px Bold)</p></div>
            <div><p className="text-headline-sm text-on-surface">Headline SM (18px Semi-Bold)</p></div>
            <div><p className="text-body-base text-on-surface">Body Base (14px Regular)</p></div>
            <div><p className="text-body-sm text-on-surface">Body SM (13px Regular)</p></div>
            <div><p className="text-label-md text-on-surface">Label MD (13px Medium)</p></div>
            <div><p className="text-label-sm text-on-surface">Label SM (11px Bold)</p></div>
          </Card>
        </section>

        <section>
          <h2 className="text-headline-md font-bold text-on-surface mb-4">Boutons</h2>
          <Card className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
            </div>
          </Card>
        </section>

        <section>
          <h2 className="text-headline-md font-bold text-on-surface mb-4">Badges & Status</h2>
          <Card className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">Default</Badge>
              <Badge variant="primary">Primary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="info">Info</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill status="Passé" />
              <StatusPill status="Échoué" />
              <StatusPill status="Bloqué" />
              <StatusPill status="En cours" />
              <StatusPill status="À tester" />
              <StatusPill status="done" />
              <StatusPill status="processing" />
              <StatusPill status="error" />
            </div>
          </Card>
        </section>

        <section>
          <h2 className="text-headline-md font-bold text-on-surface mb-4">Formulaires</h2>
          <Card className="space-y-4 max-w-md">
            <Input label="Texte" placeholder="Saisissez du texte..." />
            <Input label="Email" type="email" placeholder="email@example.com" />
            <Input label="Mot de passe" type="password" placeholder="••••••••" />
            <Input label="Avec erreur" error="Ce champ est requis" />
            <Textarea label="Description" placeholder="Description longue..." rows={3} />
            <Select
              label="Options"
              options={[
                { value: '1', label: 'Option 1' },
                { value: '2', label: 'Option 2' },
                { value: '3', label: 'Option 3' },
              ]}
            />
          </Card>
        </section>

        <section>
          <h2 className="text-headline-md font-bold text-on-surface mb-4">Toggle</h2>
          <Card className="space-y-4">
            <Toggle checked label="Option activée" onChange={() => {}} />
            <Toggle checked={false} label="Option désactivée" onChange={() => {}} />
            <Toggle checked disabled label="Désactivé (activé)" onChange={() => {}} />
            <Toggle checked={false} disabled label="Désactivé (désactivé)" onChange={() => {}} />
          </Card>
        </section>

        <section>
          <h2 className="text-headline-md font-bold text-on-surface mb-4">Cartes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>Card standard avec padding</Card>
            <Card padding={false}><div className="p-6">Card sans padding</div></Card>
            <Card hover><div className="flex items-center gap-2">Card survolable <span className="text-on-surface-variant">→</span></div></Card>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
