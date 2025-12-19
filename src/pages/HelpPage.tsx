import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { HelpCircle, ShoppingBag, Heart, MapPin, MessageCircle, CheckCircle, Package, Truck, Store, Plus, Edit, Trash2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function HelpPage() {
  const { user } = useAuth();
  const isVendor = user?.role?.startsWith('vendor');

  return (
    <div className="min-h-screen pb-20 bg-background">
      <header className="sticky top-0 z-40 bg-card border-b p-4">
        <h1 className="font-bold text-lg flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Ajuda
        </h1>
      </header>

      <main className="p-4 max-w-6xl mx-auto">
        <Tabs defaultValue={isVendor ? "vendor" : "customer"} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="customer">Cliente</TabsTrigger>
            <TabsTrigger value="vendor">Vendedor</TabsTrigger>
          </TabsList>

          {/* Guia para Clientes */}
          <TabsContent value="customer" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Como fazer um pedido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4 text-sm">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                      1
                    </span>
                    <div>
                      <p className="font-medium mb-1">Explore as lojas</p>
                      <p className="text-muted-foreground">
                        Na página inicial, você verá lojas e serviços disponíveis no seu bairro. 
                        Use as categorias para filtrar ou a busca para encontrar algo específico.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                      2
                    </span>
                    <div>
                      <p className="font-medium mb-1">Escolha produtos</p>
                      <p className="text-muted-foreground">
                        Entre na loja desejada e adicione produtos ao carrinho usando o botão "+". 
                        Você pode ajustar a quantidade diretamente na página da loja.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                      3
                    </span>
                    <div>
                      <p className="font-medium mb-1">Finalize o pedido</p>
                      <p className="text-muted-foreground">
                        Clique no carrinho flutuante (canto inferior direito) e informe seu endereço de entrega. 
                        Clique em "Finalizar via WhatsApp" para enviar o pedido diretamente para a loja.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                      4
                    </span>
                    <div>
                      <p className="font-medium mb-1">Acompanhe seu pedido</p>
                      <p className="text-muted-foreground">
                        Na aba "Pedidos", você verá todos os seus pedidos com o status atual. 
                        Você receberá notificações quando o pedido sair para entrega.
                      </p>
                    </div>
                  </li>
                </ol>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="favorites">
                <AccordionTrigger className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Como usar favoritos?
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    Ao visualizar uma loja ou serviço, você pode adicioná-lo aos favoritos clicando no ícone de coração. 
                    Seus favoritos ficam salvos na aba "Favoritos" do seu perfil para acesso rápido.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="addresses">
                <AccordionTrigger className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Como cadastrar endereços?
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    Na aba "Endereços" do seu perfil, você pode:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Adicionar múltiplos endereços (casa, trabalho, etc.)</li>
                    <li>Definir um endereço padrão</li>
                    <li>Editar ou excluir endereços cadastrados</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-2">
                    Ter endereços cadastrados facilita na hora de fazer pedidos!
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="notifications">
                <AccordionTrigger className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Sobre as notificações
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    Você receberá notificações quando:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Seu pedido for confirmado pela loja
                    </li>
                    <li className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-orange-600" />
                      O pedido estiver sendo preparado
                    </li>
                    <li className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-purple-600" />
                      O pedido sair para entrega
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      O pedido for entregue
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          {/* Guia para Vendedores */}
          <TabsContent value="vendor" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Como cadastrar sua loja/serviço
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4 text-sm">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                      1
                    </span>
                    <div>
                      <p className="font-medium mb-1">Acesse o Painel do Parceiro</p>
                      <p className="text-muted-foreground">
                        No seu perfil, clique em "Painel do Parceiro" para acessar a área de gerenciamento.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                      2
                    </span>
                    <div>
                      <p className="font-medium mb-1">Preencha os dados</p>
                      <p className="text-muted-foreground">
                        Informe o nome, descrição, categoria, WhatsApp e endereço da sua loja/serviço. 
                        Essas informações aparecerão para os clientes.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                      3
                    </span>
                    <div>
                      <p className="font-medium mb-1">Adicione produtos (se for loja)</p>
                      <p className="text-muted-foreground">
                        Para lojas de produtos, adicione seus produtos com nome, descrição, preço e foto. 
                        Você pode marcar produtos como disponíveis ou indisponíveis a qualquer momento.
                      </p>
                    </div>
                  </li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Como receber e gerenciar pedidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4 text-sm">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                      1
                    </span>
                    <div>
                      <p className="font-medium mb-1">Receba notificações</p>
                      <p className="text-muted-foreground">
                        Quando um cliente fizer um pedido, você receberá uma notificação no app e uma mensagem no WhatsApp 
                        com os detalhes do pedido e endereço de entrega.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                      2
                    </span>
                    <div>
                      <p className="font-medium mb-1">Confirme o pedido</p>
                      <p className="text-muted-foreground">
                        Entre em contato com o cliente via WhatsApp para confirmar a disponibilidade dos produtos 
                        e o prazo de entrega. Você pode atualizar o status do pedido no app.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                      3
                    </span>
                    <div>
                      <p className="font-medium mb-1">Prepare e entregue</p>
                      <p className="text-muted-foreground">
                        Após preparar o pedido, atualize o status para "Saiu para entrega" no app. 
                        Isso notificará o cliente. Quando entregar, marque como "Recebido".
                      </p>
                    </div>
                  </li>
                </ol>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="products">
                <AccordionTrigger className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Como adicionar/editar produtos?
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    No Painel do Parceiro:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Clique em "Adicionar Produto" para criar um novo produto</li>
                    <li>Preencha nome, descrição, preço e adicione uma foto</li>
                    <li>Use o botão de edição para atualizar informações</li>
                    <li>Use o switch para marcar como disponível/indisponível</li>
                    <li>Exclua produtos que não vende mais</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="status">
                <AccordionTrigger className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Status dos pedidos
                </AccordionTrigger>
                <AccordionContent>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p><strong className="text-foreground">Aguardando confirmação:</strong> Pedido recebido, aguardando sua confirmação</p>
                    <p><strong className="text-foreground">Confirmado:</strong> Você confirmou o pedido com o cliente</p>
                    <p><strong className="text-foreground">Preparando:</strong> Pedido está sendo preparado</p>
                    <p><strong className="text-foreground">Saiu para entrega:</strong> Pedido saiu para entrega (cliente será notificado)</p>
                    <p><strong className="text-foreground">Recebido:</strong> Pedido foi entregue</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
}

