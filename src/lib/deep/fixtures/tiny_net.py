import torch
from torch import nn


class TinyNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.hidden = nn.Linear(2, 3)
        self.out = nn.Linear(3, 1)

    def forward(self, x):
        h = torch.tanh(self.hidden(x))
        return torch.sigmoid(self.out(h))


model = TinyNet()
with torch.no_grad():
    model.hidden.weight.copy_(torch.tensor([[0.5, -0.3], [0.8, 0.2], [-0.4, 0.6]]))
    model.hidden.bias.copy_(torch.tensor([0.1, -0.1, 0.0]))
    model.out.weight.copy_(torch.tensor([[0.7, -0.5, 0.3]]))
    model.out.bias.copy_(torch.tensor([0.05]))

X = torch.tensor([[0.0, 0.0], [0.0, 1.0], [1.0, 0.0], [1.0, 1.0]])
y = torch.tensor([[0.0], [1.0], [1.0], [0.0]])
loss_fn = nn.BCELoss()
optimizer = torch.optim.SGD(model.parameters(), lr=0.5)

for step in range(3):
    optimizer.zero_grad()
    y_hat = model(X)
    loss = loss_fn(y_hat, y)
    loss.backward()
    optimizer.step()
    print(step, round(loss.item(), 6))

with torch.no_grad():
    print(model(X).squeeze(1))
