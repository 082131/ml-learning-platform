"""Log a training run to MLflow and register the model, gated on accuracy. Uses a local SQLite tracking store."""
import mlflow
from mlflow import MlflowClient
from sklearn.datasets import load_digits
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

mlflow.set_tracking_uri("sqlite:///mlflow.db")
mlflow.set_experiment("digits")
client = MlflowClient()

X, y = load_digits(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=360, stratify=y, random_state=0)


def train_and_register(version, n, C, threshold=0.95):
    with mlflow.start_run(run_name=f"{version}-C{C}"):
        mlflow.log_params({"data_version": version, "rows": n, "C": C})
        model = LogisticRegression(C=C, max_iter=5000).fit(X_train[:n] / 16, y_train[:n])
        acc = model.score(X_test / 16, y_test)
        mlflow.log_metric("accuracy", acc)
        info = mlflow.sklearn.log_model(model, name="model")
    try:
        prod = client.get_model_version_by_alias("digits", "production")
        prod_acc = client.get_run(prod.run_id).data.metrics["accuracy"]
    except mlflow.exceptions.MlflowException:
        prod, prod_acc = None, 0.0
    if acc < threshold or acc <= prod_acc:
        print(f"{version} C={C}: accuracy {acc:.4f}, not registered (production {prod_acc:.4f})")
        return
    mv = mlflow.register_model(info.model_uri, "digits")
    client.set_registered_model_alias("digits", "production", mv.version)
    client.set_model_version_tag("digits", mv.version, "data_version", version)
    print(f"{version} C={C}: accuracy {acc:.4f}, registered as version {mv.version} with alias production")


train_and_register("v1", 900, 1.0)
train_and_register("v1", 900, 10.0)
train_and_register("v2", len(X_train), 10.0)
prod = client.get_model_version_by_alias("digits", "production")
print("production ->", "version", prod.version, "data", prod.tags["data_version"], "run", prod.run_id[:8])
